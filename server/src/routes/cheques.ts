// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Obtener todos los cheques
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.query;

    const cheques = await prisma.cheque.findMany({
      where: estado ? { estado: estado as string } : undefined,
      orderBy: {
        fechaVencimiento: 'asc'
      }
    });

    res.json(cheques);
  } catch (error) {
    console.error('Error al obtener cheques:', error);
    res.status(500).json({ error: 'Error al obtener cheques' });
  }
});

// Obtener un cheque por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cheque = await prisma.cheque.findUnique({
      where: { id: req.params.id }
    });

    if (!cheque) {
      return res.status(404).json({ error: 'Cheque no encontrado' });
    }

    res.json(cheque);
  } catch (error) {
    console.error('Error al obtener cheque:', error);
    res.status(500).json({ error: 'Error al obtener cheque' });
  }
});

// Crear un nuevo cheque
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      numeroCheque,
      fechaEmision,
      fechaVencimiento,
      monto,
      moneda,
      banco,
      beneficiario,
      cruzado,
      observaciones
    } = req.body;

    const cheque = await prisma.cheque.create({
      data: {
        numeroCheque,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: new Date(fechaVencimiento),
        monto,
        moneda: moneda || 'ARS',
        banco,
        beneficiario,
        cruzado: cruzado || false,
        observaciones
      }
    });

    res.status(201).json(cheque);
  } catch (error) {
    console.error('Error al crear cheque:', error);
    res.status(500).json({ error: 'Error al crear cheque' });
  }
});

// Actualizar un cheque
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      numeroCheque,
      fechaEmision,
      fechaVencimiento,
      monto,
      moneda,
      banco,
      beneficiario,
      cruzado,
      estado,
      observaciones
    } = req.body;

    const cheque = await prisma.cheque.update({
      where: { id: req.params.id },
      data: {
        numeroCheque,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: new Date(fechaVencimiento),
        monto,
        moneda,
        banco,
        beneficiario,
        cruzado,
        estado,
        observaciones
      }
    });

    res.json(cheque);
  } catch (error) {
    console.error('Error al actualizar cheque:', error);
    res.status(500).json({ error: 'Error al actualizar cheque' });
  }
});

// Marcar cheque como pagado
router.patch('/:id/pagar', authMiddleware, async (req, res) => {
  try {
    const cheque = await prisma.cheque.update({
      where: { id: req.params.id },
      data: { estado: 'PAGADO' }
    });

    res.json(cheque);
  } catch (error) {
    console.error('Error al marcar cheque como pagado:', error);
    res.status(500).json({ error: 'Error al marcar cheque como pagado' });
  }
});

// Revertir cheque a pendiente
router.patch('/:id/revertir', authMiddleware, async (req, res) => {
  try {
    const cheque = await prisma.cheque.update({
      where: { id: req.params.id },
      data: { estado: 'PENDIENTE' }
    });

    res.json(cheque);
  } catch (error) {
    console.error('Error al revertir cheque:', error);
    res.status(500).json({ error: 'Error al revertir cheque' });
  }
});

// Eliminar un cheque
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.cheque.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Cheque eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cheque:', error);
    res.status(500).json({ error: 'Error al eliminar cheque' });
  }
});

export default router;
