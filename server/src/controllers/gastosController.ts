// @ts-nocheck
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

// Parsear fecha evitando desfase de timezone (agrega mediodía para no cambiar de día)
const parseFecha = (fecha: string) => {
  const soloFecha = fecha.split('T')[0];
  return new Date(`${soloFecha}T12:00:00`);
};

const gastoSchema = z.object({
  concepto: z.string().min(1),
  categoria: z.string().min(1),
  monto: z.number().positive(),
  fecha: z.string().datetime(),
  descripcion: z.string().optional(),
  tipoFactura: z.string().optional(),
  numeroFactura: z.string().optional(),
  cuentaId: z.string().optional(),
  campoId: z.string().optional(),
  campoIds: z.array(z.string()).optional(),
  loteIds: z.array(z.string()).optional(),
  maquinariaId: z.string().optional(),
  implementoId: z.string().optional(),
  campanaId: z.string().optional(),
});

export const getGastos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gastos = await prisma.gasto.findMany({
      where: {
        categoria: { not: 'Pago' }, // Excluir pagos de la lista de gastos
      },
      include: {
        cuenta: { select: { nombre: true, tipo: true } },
        campo: { select: { nombre: true } },
        lotes: {
          include: {
            lote: { select: { id: true, nombre: true } }
          }
        },
        maquinaria: { select: { nombre: true, tipo: true } },
        implemento: { select: { nombre: true, tipo: true } },
        usuario: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    res.json(gastos);
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

export const createGasto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fecha, loteIds, campoIds, campoId, campanaId, ...rest } = gastoSchema.parse(req.body);

    // Si hay múltiples campos seleccionados, crear un gasto por cada campo con monto proporcional
    if (campoIds && campoIds.length > 0) {
      // Obtener los campos con sus hectáreas
      const campos = await prisma.campo.findMany({
        where: { id: { in: campoIds } },
        select: { id: true, nombre: true, hectareas: true }
      });

      // Calcular total de hectáreas
      const totalHectareas = campos.reduce((sum, campo) => sum + campo.hectareas, 0);

      // Generar grupoId compartido para todos los gastos de esta distribución
      const grupoId = randomUUID();

      // Crear un gasto por cada campo con monto proporcional
      const gastosCreados = await Promise.all(
        campos.map(campo => {
          const proporcion = campo.hectareas / totalHectareas;
          const montoProporcional = rest.monto * proporcion;

          return prisma.gasto.create({
            data: {
              concepto: rest.concepto,
              categoria: rest.categoria,
              monto: montoProporcional,
              fecha: parseFecha(fecha),
              descripcion: rest.descripcion
                ? `${rest.descripcion} (${campo.nombre} - ${(proporcion * 100).toFixed(1)}% del total)`
                : `${campo.nombre} - ${(proporcion * 100).toFixed(1)}% del total`,
              tipoFactura: rest.tipoFactura || undefined,
              numeroFactura: rest.numeroFactura || undefined,
              campoId: campo.id,
              maquinariaId: rest.maquinariaId || undefined,
              implementoId: rest.implementoId || undefined,
              cuentaId: rest.cuentaId || undefined,
              usuarioId: req.user?.userId,
              grupoId,
              campanaId: campanaId || undefined,
            },
            include: {
              cuenta: { select: { nombre: true, tipo: true } },
              campo: { select: { nombre: true } },
              maquinaria: { select: { nombre: true, tipo: true } },
              implemento: { select: { nombre: true, tipo: true } },
              usuario: { select: { nombre: true, apellido: true } },
            },
          });
        })
      );

      res.status(201).json(gastosCreados);
    } else {
      // Comportamiento normal para un solo campo
      const gasto = await prisma.gasto.create({
        data: {
          ...rest,
          campoId: campoId || undefined,
          campanaId: campanaId || undefined,
          fecha: parseFecha(fecha),
          usuarioId: req.user?.userId,
          lotes: loteIds && loteIds.length > 0 ? {
            create: loteIds.map(loteId => ({
              lote: { connect: { id: loteId } }
            }))
          } : undefined,
        },
        include: {
          cuenta: { select: { nombre: true, tipo: true } },
          campo: { select: { nombre: true } },
          lotes: {
            include: {
              lote: { select: { id: true, nombre: true } }
            }
          },
          maquinaria: { select: { nombre: true, tipo: true } },
          implemento: { select: { nombre: true, tipo: true } },
          usuario: { select: { nombre: true, apellido: true } },
        },
      });

      res.status(201).json(gasto);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear gasto:', error);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
};

export const updateGasto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fecha, loteIds, campoIds, campoId, campanaId, ...rest } = gastoSchema.partial().parse(req.body);

    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        ...rest,
        campoId: campoId || undefined,
        campanaId: campanaId || undefined,
        fecha: fecha ? parseFecha(fecha) : undefined,
        lotes: loteIds !== undefined ? {
          deleteMany: {},
          create: loteIds.filter(Boolean).map(loteId => ({
            lote: { connect: { id: loteId } }
          })),
        } : undefined,
      },
      include: {
        cuenta: { select: { nombre: true, tipo: true } },
        campo: { select: { nombre: true } },
        lotes: {
          include: {
            lote: { select: { id: true, nombre: true } }
          }
        },
        maquinaria: { select: { nombre: true, tipo: true } },
        implemento: { select: { nombre: true, tipo: true } },
        usuario: { select: { nombre: true, apellido: true } },
      },
    });

    res.json(gasto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
};

export const deleteGasto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.gasto.delete({ where: { id } });
    res.json({ message: 'Gasto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
};
