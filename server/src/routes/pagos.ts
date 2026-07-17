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
      montosPorFactura,       // { [facturaId]: monto } en la moneda del pago
      monedaPagoMap,          // { [facturaId]: 'ARS' | 'USD' }
      tipoCambioMap,          // { [facturaId]: number } TC usado si paga en ARS factura USD
      cuentaId,
      formaPago,
      fechaPago,
      observaciones
    } = req.body;

    // Para cada factura, calcular el saldo y validar el monto
    for (const facturaId of facturaIds) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: true }
      });

      if (!factura) {
        return res.status(404).json({ error: `Factura ${facturaId} no encontrada` });
      }

      // El saldo siempre se mide en la moneda de la factura
      const totalPagadoUSD = factura.pagos.reduce((sum: number, pf: any) => {
        // Si el pago fue en ARS con TC, usamos montoUSD; si fue en la moneda de la factura, usamos monto
        return sum + (pf.montoUSD !== null && pf.montoUSD !== undefined ? pf.montoUSD : (pf.monto || 0));
      }, 0);
      const saldoRestante = factura.total - totalPagadoUSD;

      const monedaPago = monedaPagoMap ? (monedaPagoMap[facturaId] || factura.moneda) : factura.moneda;
      const tc = tipoCambioMap ? (tipoCambioMap[facturaId] || 0) : 0;
      const montoRaw = montosPorFactura ? (montosPorFactura[facturaId] || 0) : saldoRestante;

      // Convertir monto a USD si pagó en ARS
      const montoEnUSD = (factura.moneda === 'USD' && monedaPago === 'ARS' && tc > 0)
        ? montoRaw / tc
        : montoRaw;

      if (montoEnUSD > saldoRestante + 0.01) {
        return res.status(400).json({
          error: `El monto supera el saldo restante USD ${saldoRestante.toFixed(2)} de la factura ${factura.numeroFactura}`
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
          create: await Promise.all(facturaIds.map(async (facturaId: string) => {
            const factura = await prisma.factura.findUnique({ where: { id: facturaId }, include: { pagos: true } });
            const totalPagadoUSD = factura.pagos.reduce((sum: number, pf: any) =>
              sum + (pf.montoUSD !== null && pf.montoUSD !== undefined ? pf.montoUSD : (pf.monto || 0)), 0);
            const saldoRestante = factura.total - totalPagadoUSD;

            const monedaPago = monedaPagoMap ? (monedaPagoMap[facturaId] || factura.moneda) : factura.moneda;
            const tc = tipoCambioMap ? (tipoCambioMap[facturaId] || 0) : 0;
            const monto = montosPorFactura ? (montosPorFactura[facturaId] || saldoRestante) : saldoRestante;

            // Si pagó en ARS una factura USD, calcular montoUSD
            const esConversionARS = factura.moneda === 'USD' && monedaPago === 'ARS' && tc > 0;
            const montoUSD = esConversionARS ? monto / tc : null;

            return {
              facturaId,
              monto,
              monedaPago: monedaPago || 'ARS',
              tipoCambio: esConversionARS ? tc : null,
              montoUSD
            };
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

    // Actualizar el estado de cada factura según el saldo
    for (const facturaId of facturaIds) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        include: { pagos: true }
      });

      const totalPagado = factura.pagos.reduce((sum: number, pf: any) =>
        sum + (pf.montoUSD !== null && pf.montoUSD !== undefined ? pf.montoUSD : (pf.monto || 0)), 0);
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

// Actualizar fecha de un pago
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { fechaPago } = req.body;
    const pago = await prisma.pago.update({
      where: { id: req.params.id },
      data: { ...(fechaPago && { fechaPago: new Date(fechaPago) }) },
      include: { cuenta: true, facturas: { include: { factura: true } } },
    });
    res.json(pago);
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({ error: 'Error al actualizar pago' });
  }
});

// Actualizar monto/moneda de una imputación (PagoFactura)
router.put('/imputacion/:id', authMiddleware, async (req, res) => {
  try {
    const { monto, monedaPago } = req.body;
    const pf = await prisma.pagoFactura.update({
      where: { id: req.params.id },
      data: {
        ...(monto !== undefined && { monto: parseFloat(monto) }),
        ...(monedaPago && { monedaPago }),
      },
    });
    res.json(pf);
  } catch (error) {
    console.error('Error al actualizar imputación:', error);
    res.status(500).json({ error: 'Error al actualizar imputación' });
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

      const totalPagado = factura.pagos.reduce((sum: number, pf: any) =>
        sum + (pf.montoUSD !== null && pf.montoUSD !== undefined ? pf.montoUSD : (pf.monto || 0)), 0);
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
