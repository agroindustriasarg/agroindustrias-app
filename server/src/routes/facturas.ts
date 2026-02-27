// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Obtener todas las facturas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      include: {
        items: {
          include: {
            movimientoStock: {
              include: {
                stock: true
              }
            },
            stock: true
          }
        },
        servicios: {
          include: {
            campo: true,
            lote: true,
            contratista: true
          }
        }
      },
      orderBy: {
        fechaEmision: 'desc'
      }
    });
    res.json(facturas);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// Obtener remitos sin factura asignada (DEBE IR ANTES DE /:id)
router.get('/remitos/sin-factura', authMiddleware, async (req, res) => {
  try {
    // Obtener todos los movimientos de stock de tipo ENTRADA que son compras con remito
    const movimientosConRemito = await prisma.movimientoStock.findMany({
      where: {
        tipo: 'ENTRADA',
        numeroRemito: {
          not: null
        }
      },
      include: {
        stock: true,
        facturasItems: {
          include: {
            factura: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filtrar solo los que no tienen factura asignada
    const remitosSinFactura = movimientosConRemito.filter(
      mov => mov.facturasItems.length === 0
    );

    res.json(remitosSinFactura);
  } catch (error) {
    console.error('Error al obtener remitos sin factura:', error);
    res.status(500).json({ error: 'Error al obtener remitos sin factura' });
  }
});

// Obtener servicios realizados sin facturar (DEBE IR ANTES DE /:id)
router.get('/servicios/sin-factura', authMiddleware, async (req, res) => {
  try {
    const serviciosSinFactura = await prisma.servicio.findMany({
      where: {
        estado: 'REALIZADO',
        facturable: true,
        facturaId: null
      },
      include: {
        campo: true,
        lote: true,
        contratista: true,
        maquinaria: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    res.json(serviciosSinFactura);
  } catch (error) {
    console.error('Error al obtener servicios sin factura:', error);
    res.status(500).json({ error: 'Error al obtener servicios sin factura' });
  }
});

// Obtener una factura por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            movimientoStock: {
              include: {
                stock: true
              }
            },
            stock: true
          }
        },
        servicios: {
          include: {
            campo: true,
            lote: true,
            contratista: true
          }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(factura);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

// Crear una nueva factura
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      numeroFactura,
      fechaEmision,
      proveedor,
      tipoFactura,
      moneda,
      tipoCambio,
      subtotal,
      iva105,
      iva21,
      total,
      formaPago,
      fechaPago,
      estado,
      tieneRemitos,
      observaciones,
      items,
      serviciosIds
    } = req.body;

    // Validar items según el tipo de factura
    let itemsValidados = [];
    if (tieneRemitos && items && items.length > 0) {
      itemsValidados = items.map((item: any) => {
        if (!item.movimientoStockId || !item.stockId || !item.cantidad || item.precioUnitario === undefined) {
          throw new Error('Cada item con remito debe tener movimientoStockId, stockId, cantidad y precioUnitario');
        }

        return {
          movimientoStockId: item.movimientoStockId,
          stockId: item.stockId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          precioTotal: item.cantidad * item.precioUnitario
        };
      });
    }

    // Crear la factura
    const factura = await prisma.factura.create({
      data: {
        numeroFactura,
        fechaEmision: new Date(fechaEmision),
        proveedor,
        tipoFactura,
        moneda,
        tipoCambio: tipoCambio || null,
        subtotal: subtotal || 0,
        iva105: iva105 || 0,
        iva21: iva21 || 0,
        total,
        formaPago,
        fechaPago: fechaPago ? new Date(fechaPago) : null,
        estado: estado || 'PENDIENTE',
        tieneRemitos: tieneRemitos || false,
        observaciones,
        items: itemsValidados.length > 0 ? {
          create: itemsValidados
        } : undefined
      },
      include: {
        items: {
          include: {
            movimientoStock: {
              include: {
                stock: true
              }
            },
            stock: true
          }
        },
        servicios: {
          include: {
            campo: true,
            lote: true,
            contratista: true
          }
        }
      }
    });

    // Vincular servicios a la factura si se proporcionaron
    if (serviciosIds && serviciosIds.length > 0) {
      await prisma.servicio.updateMany({
        where: {
          id: {
            in: serviciosIds
          }
        },
        data: {
          facturaId: factura.id
        }
      });
    }

    res.status(201).json(factura);
  } catch (error) {
    console.error('Error al crear factura:', error);
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

// Actualizar una factura
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      numeroFactura,
      fechaEmision,
      proveedor,
      tipoFactura,
      moneda,
      tipoCambio,
      subtotal,
      iva105,
      iva21,
      total,
      formaPago,
      fechaPago,
      estado,
      tieneRemitos,
      observaciones,
      items,
      serviciosIds
    } = req.body;

    let updateData: any = {
      numeroFactura,
      fechaEmision: new Date(fechaEmision),
      proveedor,
      tipoFactura,
      moneda,
      tipoCambio: tipoCambio || null,
      subtotal: subtotal || 0,
      iva105: iva105 || 0,
      iva21: iva21 || 0,
      total,
      formaPago,
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      estado,
      tieneRemitos: tieneRemitos !== undefined ? tieneRemitos : false,
      observaciones
    };

    // Desvincular servicios anteriores solo si se envían nuevos serviciosIds
    if (serviciosIds !== undefined) {
      await prisma.servicio.updateMany({
        where: { facturaId: req.params.id },
        data: { facturaId: null }
      });
    }

    // Eliminar items existentes
    await prisma.facturaItem.deleteMany({
      where: { facturaId: req.params.id }
    });

    // Si hay items (factura con remitos), crear nuevos items
    if (items && items.length > 0) {
      const itemsValidados = items.map((item: any) => {
        if (item.movimientoStockId && item.stockId) {
          // Item con remito
          return {
            movimientoStockId: item.movimientoStockId,
            stockId: item.stockId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            precioTotal: item.cantidad * item.precioUnitario
          };
        }
        return null;
      }).filter((item: any) => item !== null);

      if (itemsValidados.length > 0) {
        updateData.items = {
          create: itemsValidados
        };
      }
    }

    const factura = await prisma.factura.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        items: {
          include: {
            movimientoStock: {
              include: {
                stock: true
              }
            },
            stock: true
          }
        },
        servicios: {
          include: {
            campo: true,
            lote: true,
            contratista: true
          }
        }
      }
    });

    // Vincular nuevos servicios si se proporcionaron
    if (serviciosIds && serviciosIds.length > 0) {
      await prisma.servicio.updateMany({
        where: {
          id: {
            in: serviciosIds
          }
        },
        data: {
          facturaId: factura.id
        }
      });
    }

    res.json(factura);
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
});

// Eliminar una factura
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Desvincular servicios antes de eliminar
    await prisma.servicio.updateMany({
      where: { facturaId: req.params.id },
      data: { facturaId: null }
    });

    await prisma.factura.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
});

export default router;
