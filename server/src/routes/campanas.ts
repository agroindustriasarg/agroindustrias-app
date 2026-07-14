// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({ orderBy: { nombre: 'asc' } });
    res.json(campanas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener campañas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { cultivo, anio } = req.body;
    if (!cultivo?.trim() || !anio?.trim()) {
      return res.status(400).json({ error: 'Cultivo y año son requeridos' });
    }
    const nombre = `${cultivo.trim()} ${anio.trim()}`;
    const campana = await prisma.campana.create({
      data: { cultivo: cultivo.trim(), anio: anio.trim(), nombre },
    });
    res.status(201).json(campana);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una campaña con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear campaña' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.campana.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campaña eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar campaña' });
  }
});

export default router;
