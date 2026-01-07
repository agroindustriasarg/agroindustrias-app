import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Obtener todos los pagos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pagos = await prisma.pago.findMany({
      include: {
        cuenta: true,
        facturas: {
          include: {
            factura: true
          }
        }
      },
      orderBy: {
        fechaPago: 'desc'
      }
    });
    res.json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// Obtener un pago por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: req.params.id },
      include: {
        cuenta: true,
        facturas: {
          include: {
            factura: true
          }
        }
      }
    });

    if (!pago) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json(pago);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({ error: 'Error al obtener pago' });
  }
});

// Crear un nuevo pago
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      facturaIds,
      cuentaId,
      formaPago,
      fechaPago,
      observaciones
    } = req.body;

    // Crear el pago con sus facturas asociadas
    const pago = await prisma.pago.create({
      data: {
        cuentaId,
        formaPago,
        fechaPago: new Date(fechaPago),
        observaciones,
        facturas: {
          create: facturaIds.map((facturaId: string) => ({
            facturaId
          }))
        }
      },
      include: {
        cuenta: true,
        facturas: {
          include: {
            factura: true
          }
        }
      }
    });

    res.status(201).json(pago);
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({ error: 'Error al crear pago' });
  }
});

// Eliminar un pago
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.pago.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Pago eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
});

export default router;
