// @ts-nocheck
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

// Crear un nuevo pago (con soporte de pago parcial)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      facturaIds,
      montosPorFactura, // { [facturaId]: monto } - si no se envía, se paga el total
      cuentaId,
      formaPago,
      fechaPago,
      observaciones
    } = req.body;

    // Para cada factura, calcular el saldo y validar el monto
    for (const facturaId of facturaIds) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: {
          pagos: {
            include: { pago: true }
          }
        }
      });

      if (!factura) {
        return res.status(404).json({ error: `Factura ${facturaId} no encontrada` });
      }

      const totalPagado = factura.pagos.reduce((sum: number, pf: any) => sum + (pf.monto || 0), 0);
      const saldoRestante = factura.total - totalPagado;

      const montoAPagar = montosPorFactura ? montosPorFactura[facturaId] : saldoRestante;

      if (montoAPagar > saldoRestante + 0.01) {
        return res.status(400).json({
          error: `El monto $${montoAPagar.toLocaleString('es-AR')} supera el saldo restante $${saldoRestante.toLocaleString('es-AR')} de la factura ${factura.numeroFactura}`
        });
      }
    }

    // Crear el pago con sus facturas asociadas
    const pago = await prisma.pago.create({
      data: {
        cuentaId,
        formaPago,
        fechaPago: new Date(fechaPago),
        observaciones,
        facturas: {
          create: facturaIds.map((facturaId: string) => {
            // Calcular monto para esta factura (si no se envía, se usa saldo total)
            const monto = montosPorFactura ? (montosPorFactura[facturaId] || 0) : 0;
            return { facturaId, monto };
          })
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

    // Actualizar el estado de cada factura según el saldo
    for (const facturaId of facturaIds) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: {
          pagos: true
        }
      });

      const totalPagado = factura.pagos.reduce((sum: number, pf: any) => sum + (pf.monto || 0), 0);
      const saldoRestante = factura.total - totalPagado;

      let nuevoEstado = 'PENDIENTE';
      if (saldoRestante <= 0.01) {
        nuevoEstado = 'PAGADA';
      } else if (totalPagado > 0) {
        nuevoEstado = 'PAGO PARCIAL';
      }

      await prisma.factura.update({
        where: { id: facturaId },
        data: { estado: nuevoEstado }
      });
    }

    res.status(201).json(pago);
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({ error: 'Error al crear pago' });
  }
});

// Eliminar un pago (y recalcular estado de facturas)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Obtener las facturas asociadas antes de eliminar
    const pagoConFacturas = await prisma.pago.findUnique({
      where: { id: req.params.id },
      include: { facturas: true }
    });

    const facturaIds = pagoConFacturas?.facturas.map((pf: any) => pf.facturaId) || [];

    await prisma.pago.delete({
      where: { id: req.params.id }
    });

    // Recalcular estado de cada factura afectada
    for (const facturaId of facturaIds) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: true }
      });

      if (!factura) continue;

      const totalPagado = factura.pagos.reduce((sum: number, pf: any) => sum + (pf.monto || 0), 0);
      const saldoRestante = factura.total - totalPagado;

      let nuevoEstado = 'PENDIENTE';
      if (saldoRestante <= 0.01) {
        nuevoEstado = 'PAGADA';
      } else if (totalPagado > 0) {
        nuevoEstado = 'PAGO PARCIAL';
      }

      await prisma.factura.update({
        where: { id: facturaId },
        data: { estado: nuevoEstado }
      });
    }

    res.json({ message: 'Pago eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
});

export default router;
