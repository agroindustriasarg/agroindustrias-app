// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const contratistaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().optional(),
  empresa: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  especialidad: z.string().optional(),
});

export const getContratistas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contratistas = await prisma.contratista.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            servicios: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(contratistas);
  } catch (error) {
    console.error('Error al obtener contratistas:', error);
    res.status(500).json({ error: 'Error al obtener contratistas' });
  }
};

export const getContratista = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contratista = await prisma.contratista.findUnique({
      where: { id },
      include: {
        servicios: {
          include: {
            campo: true,
            lote: true,
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!contratista) {
      res.status(404).json({ error: 'Contratista no encontrado' });
      return;
    }

    res.json(contratista);
  } catch (error) {
    console.error('Error al obtener contratista:', error);
    res.status(500).json({ error: 'Error al obtener contratista' });
  }
};

export const createContratista = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = contratistaSchema.parse(req.body);

    const contratista = await prisma.contratista.create({
      data: validatedData,
    });

    res.status(201).json(contratista);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear contratista:', error);
    res.status(500).json({ error: 'Error al crear contratista' });
  }
};

export const updateContratista = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = contratistaSchema.partial().parse(req.body);

    const contratista = await prisma.contratista.update({
      where: { id },
      data: validatedData,
    });

    res.json(contratista);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar contratista:', error);
    res.status(500).json({ error: 'Error al actualizar contratista' });
  }
};

export const deleteContratista = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.contratista.update({
      where: { id },
      data: { activo: false },
    });

    res.json({ message: 'Contratista eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar contratista:', error);
    res.status(500).json({ error: 'Error al eliminar contratista' });
  }
};
