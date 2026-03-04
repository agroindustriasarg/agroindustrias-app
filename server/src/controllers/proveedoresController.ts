import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

const proveedorSchema = z.object({
  nombre: z.string().min(1),
});

export const getProveedores = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(proveedores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
};

export const createProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre } = proveedorSchema.parse(req.body);
    const proveedor = await prisma.proveedor.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    res.status(201).json(proveedor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
};
