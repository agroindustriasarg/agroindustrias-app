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
            }
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
            }
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
      total,
      formaPago,
      fechaPago,
      estado,
      observaciones,
      items // Array de { movimientoStockId, precioTotal }
    } = req.body;

    // Calcular precio unitario para cada item
    const itemsConPrecio = await Promise.all(
      items.map(async (item: any) => {
        // Obtener el movimiento de stock para saber la cantidad
        const movimiento = await prisma.movimientoStock.findUnique({
          where: { id: item.movimientoStockId }
        });

        if (!movimiento) {
          throw new Error(`Movimiento de stock ${item.movimientoStockId} no encontrado`);
        }

        // Calcular precio unitario = precioTotal / cantidad
        const precioUnitario = item.precioTotal / movimiento.cantidad;

        return {
          movimientoStockId: item.movimientoStockId,
          precioUnitario,
          precioTotal: item.precioTotal
        };
      })
    );

    // Crear la factura con sus items
    const factura = await prisma.factura.create({
      data: {
        numeroFactura,
        fechaEmision: new Date(fechaEmision),
        proveedor,
        tipoFactura,
        moneda,
        total,
        formaPago,
        fechaPago: fechaPago ? new Date(fechaPago) : null,
        estado: estado || 'PENDIENTE',
        observaciones,
        items: {
          create: itemsConPrecio
        }
      },
      include: {
        items: {
          include: {
            movimientoStock: {
              include: {
                stock: true
              }
            }
          }
        }
      }
    });

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
      total,
      formaPago,
      fechaPago,
      estado,
      observaciones,
      items
    } = req.body;

    // Si se actualizan los items, recalcular precios
    let updateData: any = {
      numeroFactura,
      fechaEmision: new Date(fechaEmision),
      proveedor,
      tipoFactura,
      moneda,
      total,
      formaPago,
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      estado,
      observaciones
    };

    if (items) {
      // Eliminar items existentes
      await prisma.facturaItem.deleteMany({
        where: { facturaId: req.params.id }
      });

      // Crear nuevos items con precios calculados
      const itemsConPrecio = await Promise.all(
        items.map(async (item: any) => {
          const movimiento = await prisma.movimientoStock.findUnique({
            where: { id: item.movimientoStockId }
          });

          if (!movimiento) {
            throw new Error(`Movimiento de stock ${item.movimientoStockId} no encontrado`);
          }

          const precioUnitario = item.precioTotal / movimiento.cantidad;

          return {
            movimientoStockId: item.movimientoStockId,
            precioUnitario,
            precioTotal: item.precioTotal
          };
        })
      );

      updateData.items = {
        create: itemsConPrecio
      };
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
            }
          }
        }
      }
    });

    res.json(factura);
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
});

// Eliminar una factura
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.factura.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
});

// Obtener remitos sin factura asignada
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

export default router;
