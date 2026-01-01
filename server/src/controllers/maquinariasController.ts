import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const maquinariaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.number().int().optional(),
  patente: z.string().optional(),
  estado: z.string().optional(),
  horasUso: z.number().optional(),
  ultimoMantenimiento: z.string().datetime().optional(),
  proximoMantenimiento: z.string().datetime().optional(),
  descripcion: z.string().optional(),
});

export const getMaquinarias = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const maquinarias = await prisma.maquinaria.findMany({
      include: {
        _count: {
          select: {
            servicios: true,
            gastos: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(maquinarias);
  } catch (error) {
    console.error('Error al obtener maquinarias:', error);
    res.status(500).json({ error: 'Error al obtener maquinarias' });
  }
};

export const getMaquinaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const maquinaria = await prisma.maquinaria.findUnique({
      where: { id },
      include: {
        servicios: {
          include: {
            campo: true,
            lote: true,
          },
          orderBy: { fecha: 'desc' },
        },
        gastos: {
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!maquinaria) {
      res.status(404).json({ error: 'Maquinaria no encontrada' });
      return;
    }

    res.json(maquinaria);
  } catch (error) {
    console.error('Error al obtener maquinaria:', error);
    res.status(500).json({ error: 'Error al obtener maquinaria' });
  }
};

export const createMaquinaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ultimoMantenimiento, proximoMantenimiento, ...rest } = maquinariaSchema.parse(req.body);

    const maquinaria = await prisma.maquinaria.create({
      data: {
        ...rest,
        ultimoMantenimiento: ultimoMantenimiento ? new Date(ultimoMantenimiento) : undefined,
        proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : undefined,
      },
    });

    res.status(201).json(maquinaria);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear maquinaria:', error);
    res.status(500).json({ error: 'Error al crear maquinaria' });
  }
};

export const updateMaquinaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ultimoMantenimiento, proximoMantenimiento, ...rest } = maquinariaSchema.partial().parse(req.body);

    const maquinaria = await prisma.maquinaria.update({
      where: { id },
      data: {
        ...rest,
        ultimoMantenimiento: ultimoMantenimiento ? new Date(ultimoMantenimiento) : undefined,
        proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : undefined,
      },
    });

    res.json(maquinaria);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar maquinaria:', error);
    res.status(500).json({ error: 'Error al actualizar maquinaria' });
  }
};

export const deleteMaquinaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.maquinaria.delete({
      where: { id },
    });

    res.json({ message: 'Maquinaria eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar maquinaria:', error);
    res.status(500).json({ error: 'Error al eliminar maquinaria' });
  }
};
