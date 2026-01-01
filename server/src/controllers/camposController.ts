import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const campoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  ubicacion: z.string().min(1, 'La ubicación es requerida'),
  hectareas: z.number().positive('Las hectáreas deben ser positivas'),
  descripcion: z.string().optional(),
});

const loteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  hectareas: z.number().positive('Las hectáreas deben ser positivas'),
  cultivo: z.string().optional(),
  estado: z.string().optional(),
  descripcion: z.string().optional(),
});

export const getCampos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campos = await prisma.campo.findMany({
      where: { activo: true },
      include: {
        lotes: true,
        _count: {
          select: {
            servicios: true,
            gastos: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(campos);
  } catch (error) {
    console.error('Error al obtener campos:', error);
    res.status(500).json({ error: 'Error al obtener campos' });
  }
};

export const getCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const campo = await prisma.campo.findUnique({
      where: { id },
      include: {
        lotes: true,
        servicios: {
          include: {
            lote: true,
            maquinaria: true,
            usuario: {
              select: { nombre: true, apellido: true },
            },
          },
          orderBy: { fecha: 'desc' },
        },
        gastos: {
          include: {
            usuario: {
              select: { nombre: true, apellido: true },
            },
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!campo) {
      res.status(404).json({ error: 'Campo no encontrado' });
      return;
    }

    res.json(campo);
  } catch (error) {
    console.error('Error al obtener campo:', error);
    res.status(500).json({ error: 'Error al obtener campo' });
  }
};

export const createCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = campoSchema.parse(req.body);

    const campo = await prisma.campo.create({
      data: validatedData,
    });

    res.status(201).json(campo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear campo:', error);
    res.status(500).json({ error: 'Error al crear campo' });
  }
};

export const updateCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = campoSchema.partial().parse(req.body);

    const campo = await prisma.campo.update({
      where: { id },
      data: validatedData,
    });

    res.json(campo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar campo:', error);
    res.status(500).json({ error: 'Error al actualizar campo' });
  }
};

export const deleteCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.campo.update({
      where: { id },
      data: { activo: false },
    });

    res.json({ message: 'Campo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar campo:', error);
    res.status(500).json({ error: 'Error al eliminar campo' });
  }
};

// ========== LOTES ==========

export const createLote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campoId } = req.params;
    const validatedData = loteSchema.parse(req.body);

    const lote = await prisma.lote.create({
      data: {
        ...validatedData,
        campoId,
      },
    });

    res.status(201).json(lote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear lote:', error);
    res.status(500).json({ error: 'Error al crear lote' });
  }
};

export const updateLote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = loteSchema.partial().parse(req.body);

    const lote = await prisma.lote.update({
      where: { id },
      data: validatedData,
    });

    res.json(lote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar lote:', error);
    res.status(500).json({ error: 'Error al actualizar lote' });
  }
};

export const deleteLote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.lote.delete({
      where: { id },
    });

    res.json({ message: 'Lote eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar lote:', error);
    res.status(500).json({ error: 'Error al eliminar lote' });
  }
};
