import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const rendimientoSchema = z.object({
  campoId: z.string().min(1),
  loteId: z.string().optional(),
  cultivo: z.string().min(1),
  fechaCosecha: z.string().datetime(),
  cantidad: z.number().positive(),
  unidad: z.enum(['kg', 'tn']),
  superficie: z.number().positive(),
  unidadSuperficie: z.enum(['ha', 'surco']),
  observaciones: z.string().optional(),
});

export const getRendimientos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rendimientos = await prisma.rendimiento.findMany({
      orderBy: { fechaCosecha: 'desc' },
    });

    res.json(rendimientos);
  } catch (error) {
    console.error('Error al obtener rendimientos:', error);
    res.status(500).json({ error: 'Error al obtener rendimientos' });
  }
};

export const createRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = rendimientoSchema.parse(req.body);

    // Calcular rendimiento por hectárea si la unidad de superficie es 'ha'
    let rendimientoHa: number | null = null;
    if (validatedData.unidadSuperficie === 'ha') {
      // Convertir a toneladas si está en kg
      const cantidadEnTn = validatedData.unidad === 'kg'
        ? validatedData.cantidad / 1000
        : validatedData.cantidad;

      rendimientoHa = cantidadEnTn / validatedData.superficie;
    }

    const rendimiento = await prisma.rendimiento.create({
      data: {
        ...validatedData,
        fechaCosecha: new Date(validatedData.fechaCosecha),
        rendimientoHa,
        usuarioId: req.user?.userId,
      },
    });

    res.status(201).json(rendimiento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear rendimiento:', error);
    res.status(500).json({ error: 'Error al crear rendimiento' });
  }
};

export const updateRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = rendimientoSchema.partial().parse(req.body);

    // Recalcular rendimiento por hectárea si se actualizan los datos relevantes
    const dataToUpdate: any = {
      ...validatedData,
      fechaCosecha: validatedData.fechaCosecha ? new Date(validatedData.fechaCosecha) : undefined,
    };

    // Si se actualizó algún dato relevante, recalcular rendimientoHa
    if (validatedData.cantidad || validatedData.unidad || validatedData.superficie || validatedData.unidadSuperficie) {
      const rendimientoActual = await prisma.rendimiento.findUnique({ where: { id } });

      if (rendimientoActual) {
        const cantidad = validatedData.cantidad ?? rendimientoActual.cantidad;
        const unidad = validatedData.unidad ?? rendimientoActual.unidad;
        const superficie = validatedData.superficie ?? rendimientoActual.superficie;
        const unidadSuperficie = validatedData.unidadSuperficie ?? rendimientoActual.unidadSuperficie;

        if (unidadSuperficie === 'ha') {
          const cantidadEnTn = unidad === 'kg' ? cantidad / 1000 : cantidad;
          dataToUpdate.rendimientoHa = cantidadEnTn / superficie;
        } else {
          dataToUpdate.rendimientoHa = null;
        }
      }
    }

    const rendimiento = await prisma.rendimiento.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(rendimiento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar rendimiento:', error);
    res.status(500).json({ error: 'Error al actualizar rendimiento' });
  }
};

export const deleteRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.rendimiento.delete({ where: { id } });
    res.json({ message: 'Rendimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar rendimiento:', error);
    res.status(500).json({ error: 'Error al eliminar rendimiento' });
  }
};

// Obtener rendimientos por campo
export const getRendimientosPorCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campoId } = req.params;

    const rendimientos = await prisma.rendimiento.findMany({
      where: { campoId },
      orderBy: { fechaCosecha: 'desc' },
    });

    res.json(rendimientos);
  } catch (error) {
    console.error('Error al obtener rendimientos por campo:', error);
    res.status(500).json({ error: 'Error al obtener rendimientos' });
  }
};

// Obtener rendimientos por lote
export const getRendimientosPorLote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loteId } = req.params;

    const rendimientos = await prisma.rendimiento.findMany({
      where: { loteId },
      orderBy: { fechaCosecha: 'desc' },
    });

    res.json(rendimientos);
  } catch (error) {
    console.error('Error al obtener rendimientos por lote:', error);
    res.status(500).json({ error: 'Error al obtener rendimientos' });
  }
};
