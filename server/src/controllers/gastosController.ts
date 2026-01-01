// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

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
  loteIds: z.array(z.string()).optional(),
  maquinariaId: z.string().optional(),
  implementoId: z.string().optional(),
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
    const { fecha, loteIds, ...rest } = gastoSchema.parse(req.body);

    const gasto = await prisma.gasto.create({
      data: {
        ...rest,
        fecha: new Date(fecha),
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
    const { fecha, ...rest } = gastoSchema.partial().parse(req.body);

    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        ...rest,
        fecha: fecha ? new Date(fecha) : undefined,
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
