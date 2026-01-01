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
});

export const getServicios = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const servicios = await prisma.servicio.findMany({
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
    const { fecha, hectareas, costoPorHa, ...rest } = servicioSchema.parse(req.body);

    // Calcular total automáticamente
    const total = hectareas && costoPorHa ? hectareas * costoPorHa : undefined;

    const servicio = await prisma.servicio.create({
      data: {
        ...rest,
        fecha: new Date(fecha),
        hectareas,
        costoPorHa,
        total,
        usuarioId: req.user?.userId,
      },
      include: {
        campo: { select: { nombre: true } },
        lote: { select: { nombre: true } },
        maquinaria: { select: { nombre: true } },
        contratista: { select: { nombre: true, apellido: true, empresa: true } },
        usuario: { select: { nombre: true, apellido: true } },
      },
    });

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
    const { fecha, hectareas, costoPorHa, estado, ...rest } = servicioSchema.partial().parse(req.body);

    // Obtener el servicio actual
    const servicioActual = await prisma.servicio.findUnique({
      where: { id },
    });

    if (!servicioActual) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }

    // Si se está cambiando el estado a REALIZADO y es tipo Pulverización
    if (estado === 'REALIZADO' && servicioActual.estado !== 'REALIZADO' && servicioActual.tipo === 'Pulverización') {
      // Validar que hay stock suficiente
      if (servicioActual.receta && servicioActual.hectareas) {
        const receta = JSON.parse(servicioActual.receta);

        // Verificar stock para cada producto
        for (const item of receta) {
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

            // Calcular cantidad total necesaria
            const dosisHa = parseFloat(item.cantidad); // cantidad por hectárea
            const cantidadNecesaria = dosisHa * servicioActual.hectareas;

            // Convertir unidades si es necesario para comparación
            let cantidadEnStockComparable = stock.cantidad;

            // Si la unidad es L/ha o kg/ha, extraer solo la unidad base
            const unidadBase = item.unidad.split('/')[0]; // 'L' de 'L/ha' o 'kg' de 'kg/ha'

            if (cantidadEnStockComparable < cantidadNecesaria) {
              res.status(400).json({
                error: `Stock insuficiente de ${item.producto}. Disponible: ${cantidadEnStockComparable.toFixed(2)} ${unidadBase}, Necesario: ${cantidadNecesaria.toFixed(2)} ${unidadBase}`
              });
              return;
            }
          }
        }

        // Si todo está OK, descontar del stock y crear movimientos
        for (const item of receta) {
          if (item.stockId) {
            const dosisHa = parseFloat(item.cantidad);
            const cantidadNecesaria = dosisHa * servicioActual.hectareas;

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
                servicioId: id,
                campoId: servicioActual.campoId,
                loteId: servicioActual.loteId || undefined,
                observaciones: `Pulverización - ${item.producto} (${dosisHa} ${item.unidad})`,
              },
            });
          }
        }
      }
    }

    // Si se está cambiando de REALIZADO a PENDIENTE y es tipo Pulverización, devolver stock
    if (estado === 'PENDIENTE' && servicioActual.estado === 'REALIZADO' && servicioActual.tipo === 'Pulverización') {
      if (servicioActual.receta && servicioActual.hectareas) {
        const receta = JSON.parse(servicioActual.receta);

        for (const item of receta) {
          if (item.stockId) {
            const dosisHa = parseFloat(item.cantidad);
            const cantidadADevolver = dosisHa * servicioActual.hectareas;

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
                motivo: 'Devolución de pulverización cancelada',
                servicioId: id,
                observaciones: `Reversión de pulverización - ${item.producto}`,
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
        estado,
        fecha: fecha ? new Date(fecha) : undefined,
        hectareas,
        costoPorHa,
        total,
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
    await prisma.servicio.delete({ where: { id } });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};
