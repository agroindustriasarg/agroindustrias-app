// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const parseFecha = (fecha: string) => new Date(`${fecha.split('T')[0]}T12:00:00`);

// GET /ventas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { campanaId, campoId, grano } = req.query;
    const where: any = {};
    if (campanaId) where.campanaId = campanaId;
    if (campoId) where.campoId = campoId;
    if (grano) where.grano = grano;

    const ventas = await prisma.ventaGrano.findMany({
      where,
      include: { campana: true, campo: true },
      orderBy: { fecha: 'desc' },
    });
    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// POST /ventas
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      fecha, numeroLiquidacion, grano, grado, kgEntregados,
      precioTn, fleteTn, retenciones, otrasRetenciones, deducciones, importeNeto,
      destino, campanaId, campoId, observaciones,
    } = req.body;

    const venta = await prisma.ventaGrano.create({
      data: {
        fecha: parseFecha(fecha),
        numeroLiquidacion: numeroLiquidacion || null,
        grano,
        grado: grado || null,
        kgEntregados: parseFloat(kgEntregados),
        precioTn: parseFloat(precioTn),
        fleteTn: fleteTn ? parseFloat(fleteTn) : null,
        retenciones: retenciones ? parseFloat(retenciones) : null,
        otrasRetenciones: otrasRetenciones ? parseFloat(otrasRetenciones) : null,
        deducciones: deducciones ? parseFloat(deducciones) : null,
        importeNeto: parseFloat(importeNeto),
        destino: destino || null,
        campanaId: campanaId || null,
        campoId: campoId || null,
        observaciones: observaciones || null,
      },
      include: { campana: true, campo: true },
    });
    res.status(201).json(venta);
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  }
});

// PUT /ventas/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      fecha, numeroLiquidacion, grano, grado, kgEntregados,
      precioTn, fleteTn, retenciones, otrasRetenciones, deducciones, importeNeto,
      destino, campanaId, campoId, observaciones,
    } = req.body;

    const venta = await prisma.ventaGrano.update({
      where: { id: req.params.id },
      data: {
        fecha: parseFecha(fecha),
        numeroLiquidacion: numeroLiquidacion || null,
        grano,
        grado: grado || null,
        kgEntregados: parseFloat(kgEntregados),
        precioTn: parseFloat(precioTn),
        fleteTn: fleteTn ? parseFloat(fleteTn) : null,
        retenciones: retenciones ? parseFloat(retenciones) : null,
        otrasRetenciones: otrasRetenciones ? parseFloat(otrasRetenciones) : null,
        deducciones: deducciones ? parseFloat(deducciones) : null,
        importeNeto: parseFloat(importeNeto),
        destino: destino || null,
        campanaId: campanaId || null,
        campoId: campoId || null,
        observaciones: observaciones || null,
      },
      include: { campana: true, campo: true },
    });
    res.json(venta);
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

// DELETE /ventas/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.ventaGrano.delete({ where: { id: req.params.id } });
    res.json({ message: 'Venta eliminada' });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

export default router;
