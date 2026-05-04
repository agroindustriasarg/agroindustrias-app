// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const destinos = await prisma.destino.findMany({ orderBy: { nombre: 'asc' } });
    res.json(destinos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener destinos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const destino = await prisma.destino.create({ data: { nombre: nombre.trim() } });
    res.status(201).json(destino);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un destino con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear destino' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.destino.delete({ where: { id: req.params.id } });
    res.json({ message: 'Destino eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar destino' });
  }
});

export default router;
