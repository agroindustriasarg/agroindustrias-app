// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const servicioSchema = z.object({
  tipo: z.string().min(1),
  fecha: z.string().datetime(),
  descripcion: z.string().optional(),
  hectareas: z.number().positive().optional(),
  costoPorHa: z.number().optional(),
  moneda: z.enum(['ARS', 'USD']).default('ARS'),
  campoId: z.string(),
  loteId: z.string().optional(),
  maquinariaId: z.string().optional(),
  contratistaId: z.string().optional(),
  variedad: z.string().optional(),
  tipoFertilizante: z.string().optional(),
  dosisKgHa: z.number().positive().optional(),
  unidadDosis: z.string().optional(),
  caldo: z.number().positive().optional(),
  receta: z.string().optional(),
  estado: z.enum(['PENDIENTE', 'REALIZADO']).optional(),
  campanaId: z.string().optional(),
});

export const getServicios = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { facturable, estado, sinFacturar } = req.query;

    const whereClause: any = {};

    // Filtrar por facturable si se especifica
    if (facturable !== undefined) {
      whereClause.facturable = facturable === 'true';
    }

    // Filtrar por estado si se especifica
    if (estado && typeof estado === 'string') {
      whereClause.estado = estado;
    }

    // Filtrar servicios sin facturar (que no tienen facturaId)
    if (sinFacturar === 'true') {
      whereClause.facturaId = null;
    }

    const servicios = await prisma.servicio.findMany({
      where: whereClause,
      include: {
        campo: { select: { nombre: true } },
        lote: { select: { nombre: true } },
        maquinaria: { select: { nombre: true } },
        contratista: { select: { nombre: true, apellido: true, empresa: true } },
        usuario: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

export const createServicio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fecha, hectareas, costoPorHa, tipo, receta, campanaId, ...rest } = servicioSchema.parse(req.body);

    // Si es una pulverización con receta, solo verificar que los productos existan (no validar cantidad)
    if (tipo === 'Pulverización' && receta && hectareas) {
      const recetaData = JSON.parse(receta);

      // Verificar que los productos existan en stock
      for (const item of recetaData) {
        if (item.stockId) {
          const stock = await prisma.stock.findUnique({
            where: { id: item.stockId },
          });

          if (!stock) {
            res.status(400).json({
              error: `Producto ${item.producto} no encontrado en stock`
            });
            return;
          }
        }
      }
    }

    // Calcular total automáticamente
    const total = hectareas && costoPorHa ? hectareas * costoPorHa : undefined;

    // Crear el servicio
    const servicio = await prisma.servicio.create({
      data: {
        ...rest,
        tipo,
        receta,
        fecha: new Date(fecha),
        hectareas,
        costoPorHa,
        total,
        usuarioId: req.user?.userId,
        campanaId: campanaId || undefined,
      },
      include: {
        campo: { select: { nombre: true } },
        lote: { select: { nombre: true } },
        maquinaria: { select: { nombre: true } },
        contratista: { select: { nombre: true, apellido: true, empresa: true } },
        usuario: { select: { nombre: true, apellido: true } },
      },
    });

    // DESPUÉS de crear el servicio, descontar del stock si es pulverización
    if (tipo === 'Pulverización' && receta && hectareas) {
      const recetaData = JSON.parse(receta);

      for (const item of recetaData) {
        if (item.stockId) {
          const dosisHa = parseFloat(item.cantidad);
          const cantidadNecesaria = dosisHa * hectareas;

          // Descontar del stock
          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              cantidad: {
                decrement: cantidadNecesaria,
              },
            },
          });

          // Crear movimiento de stock
          await prisma.movimientoStock.create({
            data: {
              stockId: item.stockId,
              tipo: 'SALIDA',
              cantidad: cantidadNecesaria,
              motivo: 'Uso en pulverización',
              fecha: new Date(fecha),
              servicioId: servicio.id,
              campoId: servicio.campoId,
              loteId: servicio.loteId || undefined,
              observaciones: `Pulverización - ${item.producto} (${dosisHa} ${item.unidad})`,
            },
          });
        }
      }
    }

    res.status(201).json(servicio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
};

export const updateServicio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fecha, hectareas, costoPorHa, estado, tipo, receta, campanaId, ...rest } = servicioSchema.partial().parse(req.body);

    // Obtener el servicio actual
    const servicioActual = await prisma.servicio.findUnique({
      where: { id },
    });

    if (!servicioActual) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }

    // Si es una pulverización y se está modificando la receta o las hectáreas, ajustar stock
    if (servicioActual.tipo === 'Pulverización' && servicioActual.receta && servicioActual.hectareas && (receta || hectareas)) {
      const recetaAnterior = JSON.parse(servicioActual.receta);
      const hectareasAnteriores = servicioActual.hectareas;
      const nuevaReceta = receta ? JSON.parse(receta) : recetaAnterior;
      const nuevasHectareas = hectareas !== undefined ? hectareas : hectareasAnteriores;

      // PASO 1: Devolver TODO el stock de la receta anterior
      for (const item of recetaAnterior) {
        if (item.stockId) {
          const dosisHa = parseFloat(item.cantidad);
          const cantidadADevolver = dosisHa * hectareasAnteriores;

          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              cantidad: {
                increment: cantidadADevolver,
              },
            },
          });
        }
      }

      // PASO 2: Descontar TODO el stock de la nueva receta
      for (const item of nuevaReceta) {
        if (item.stockId) {
          const dosisHa = parseFloat(item.cantidad);
          const cantidadNueva = dosisHa * nuevasHectareas;

          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              cantidad: {
                decrement: cantidadNueva,
              },
            },
          });

          // Crear UN SOLO movimiento de ajuste neto
          const cantidadAnteriorItem = recetaAnterior.find((i: any) => i.stockId === item.stockId);
          const cantidadAnterior = cantidadAnteriorItem
            ? parseFloat(cantidadAnteriorItem.cantidad) * hectareasAnteriores
            : 0;

          const diferencia = cantidadNueva - cantidadAnterior;

          if (diferencia !== 0) {
            await prisma.movimientoStock.create({
              data: {
                stockId: item.stockId,
                tipo: diferencia > 0 ? 'SALIDA' : 'ENTRADA',
                cantidad: Math.abs(diferencia),
                motivo: 'Modificación de orden de pulverización',
                fecha: fecha ? new Date(fecha) : servicioActual.fecha,
                servicioId: id,
                observaciones: `Ajuste: ${diferencia > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(diferencia).toFixed(2)} ${item.unidad.split('/')[0]}`,
              },
            });
          }
        }
      }
    }

    // Calcular total automáticamente si se proporcionan hectareas y costoPorHa
    const total = hectareas && costoPorHa ? hectareas * costoPorHa : undefined;

    const servicio = await prisma.servicio.update({
      where: { id },
      data: {
        ...rest,
        tipo,
        receta,
        estado,
        fecha: fecha ? new Date(fecha) : undefined,
        hectareas,
        costoPorHa,
        total,
        campanaId: campanaId || undefined,
      },
    });

    res.json(servicio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
};

export const deleteServicio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Obtener el servicio antes de eliminarlo para devolver stock si es necesario
    const servicio = await prisma.servicio.findUnique({
      where: { id },
    });

    if (!servicio) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }

    // Si es una pulverización con receta, devolver el stock antes de eliminar
    if (servicio.tipo === 'Pulverización' && servicio.receta && servicio.hectareas) {
      const receta = JSON.parse(servicio.receta);

      for (const item of receta) {
        if (item.stockId) {
          const dosisHa = parseFloat(item.cantidad);
          const cantidadADevolver = dosisHa * servicio.hectareas;

          // Devolver al stock
          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              cantidad: {
                increment: cantidadADevolver,
              },
            },
          });

          // Crear movimiento de entrada para registro
          await prisma.movimientoStock.create({
            data: {
              stockId: item.stockId,
              tipo: 'ENTRADA',
              cantidad: cantidadADevolver,
              motivo: 'Devolución por eliminación de servicio',
              observaciones: `Reversión de pulverización eliminada - ${item.producto}`,
            },
          });
        }
      }
    }

    await prisma.servicio.delete({ where: { id } });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};
