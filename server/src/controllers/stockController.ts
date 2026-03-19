// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const stockSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  cantidad: z.number(),
  unidad: z.string().min(1),
  precioUnitario: z.number().optional(),
  stockMinimo: z.number().optional(),
  ubicacion: z.string().optional(),
  descripcion: z.string().optional(),
  droga: z.string().optional(),
  nombreComercial: z.string().optional(),
  tipo: z.string().optional(),
});

const movimientoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA']),
  cantidad: z.number().positive(),
  motivo: z.string().optional(),
  observaciones: z.string().optional(),
  fecha: z.string().optional(),
  // Campos para ENTRADA
  precio: z.number().optional(),
  proveedor: z.string().optional(),
  precioUnitario: z.number().optional(),
  tipoFactura: z.string().optional(),
  numeroRemito: z.string().optional(),
  numeroFactura: z.string().optional(),
  cuentaId: z.string().optional(),
  // Campos para SALIDA
  maquinariaId: z.string().optional(),
  implementoId: z.string().optional(),
  servicioId: z.string().optional(),
  campoId: z.string().optional(),
  loteId: z.string().optional(),
});

export const getStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stock = await prisma.stock.findMany({
      include: {
        movimientos: {
          take: 5,
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(stock);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    res.status(500).json({ error: 'Error al obtener stock' });
  }
};

export const getStockById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const stock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      res.status(404).json({ error: 'Stock no encontrado' });
      return;
    }

    res.json(stock);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    res.status(500).json({ error: 'Error al obtener stock' });
  }
};

export const getMovimientos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const movimientos = await prisma.movimientoStock.findMany({
      where: { stockId: id },
      orderBy: { fecha: 'desc' },
    });

    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

export const getMovimientosAgroquimicos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Obtener todos los productos de la categoría Agroquímicos
    const agroquimicos = await prisma.stock.findMany({
      where: { categoria: 'Agroquímicos' },
      select: { id: true },
    });

    const agroquimicosIds = agroquimicos.map(a => a.id);

    // Obtener todos los movimientos de esos productos de una sola vez
    const movimientos = await prisma.movimientoStock.findMany({
      where: {
        stockId: {
          in: agroquimicosIds,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos de agroquímicos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos de agroquímicos' });
  }
};

export const createStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = stockSchema.parse(req.body);
    const stock = await prisma.stock.create({ data: validatedData });
    res.status(201).json(stock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear stock:', error);
    res.status(500).json({ error: 'Error al crear stock' });
  }
};

export const updateStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = stockSchema.partial().parse(req.body);
    const stock = await prisma.stock.update({
      where: { id },
      data: validatedData,
    });
    res.json(stock);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
};

export const deleteStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.stock.delete({ where: { id } });
    res.json({ message: 'Stock eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar stock:', error);
    res.status(500).json({ error: 'Error al eliminar stock' });
  }
};

export const createMovimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stockId } = req.params;
    const validatedData = movimientoSchema.parse(req.body);

    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) {
      res.status(404).json({ error: 'Stock no encontrado' });
      return;
    }

    const nuevaCantidad = validatedData.tipo === 'ENTRADA'
      ? stock.cantidad + validatedData.cantidad
      : stock.cantidad - validatedData.cantidad;

    if (validatedData.tipo === 'SALIDA' && nuevaCantidad < 0) {
      res.status(400).json({ error: 'Stock insuficiente' });
      return;
    }

    // Crear el movimiento y actualizar stock
    const operations: any[] = [
      prisma.movimientoStock.create({
        data: {
          ...validatedData,
          stockId,
          fecha: validatedData.fecha ? new Date(validatedData.fecha) : new Date(),
        },
      }),
      prisma.stock.update({
        where: { id: stockId },
        data: { cantidad: nuevaCantidad },
      }),
    ];

    // Si es una ENTRADA con cuenta y precio, crear también un gasto
    if (validatedData.tipo === 'ENTRADA' && validatedData.cuentaId && validatedData.precio) {
      const conceptoGasto = `Compra de ${stock.nombre}${validatedData.proveedor ? ` - ${validatedData.proveedor}` : ''}`;

      operations.push(
        prisma.gasto.create({
          data: {
            concepto: conceptoGasto,
            categoria: 'Insumos',
            monto: validatedData.precio,
            fecha: validatedData.fecha ? new Date(validatedData.fecha) : new Date(),
            descripcion: validatedData.motivo || validatedData.observaciones,
            tipoFactura: validatedData.tipoFactura,
            numeroFactura: validatedData.numeroFactura,
            cuentaId: validatedData.cuentaId,
            usuarioId: req.user?.userId,
          },
        })
      );
    }

    const [movimiento] = await prisma.$transaction(operations);

    res.status(201).json(movimiento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear movimiento:', error);
    res.status(500).json({ error: 'Error al crear movimiento' });
  }
};

export const deleteMovimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stockId, movimientoId } = req.params;

    console.log('🗑️  Eliminando movimiento:', { stockId, movimientoId });

    // Obtener el movimiento para revertir la cantidad
    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id: movimientoId },
      include: { stock: true },
    });

    if (!movimiento) {
      console.log('❌ Movimiento no encontrado');
      res.status(404).json({ error: 'Movimiento no encontrado' });
      return;
    }

    if (movimiento.stockId !== stockId) {
      console.log('❌ El movimiento no pertenece a este stock');
      res.status(400).json({ error: 'El movimiento no pertenece a este stock' });
      return;
    }

    // Calcular la nueva cantidad revirtiendo el movimiento
    const nuevaCantidad = movimiento.tipo === 'ENTRADA'
      ? movimiento.stock.cantidad - movimiento.cantidad
      : movimiento.stock.cantidad + movimiento.cantidad;

    console.log('📊 Ajustando stock:', {
      stockActual: movimiento.stock.cantidad,
      tipoMovimiento: movimiento.tipo,
      cantidadMovimiento: movimiento.cantidad,
      nuevoStock: nuevaCantidad
    });

    // Permitir stock negativo (eliminamos la restricción)

    // Preparar operaciones de transacción
    const operations: any[] = [
      prisma.movimientoStock.delete({
        where: { id: movimientoId },
      }),
      prisma.stock.update({
        where: { id: stockId },
        data: { cantidad: nuevaCantidad },
      }),
    ];

    // Si es una ENTRADA con cuenta y precio, buscar y eliminar el gasto relacionado
    if (movimiento.tipo === 'ENTRADA' && movimiento.cuentaId && movimiento.precio) {
      const conceptoGasto = `Compra de ${movimiento.stock.nombre}${movimiento.proveedor ? ` - ${movimiento.proveedor}` : ''}`;

      console.log('🔍 Buscando gasto relacionado con:', {
        concepto: conceptoGasto,
        monto: movimiento.precio,
        cuentaId: movimiento.cuentaId,
        categoria: 'Insumos',
      });

      // Buscar gastos que coincidan con el concepto, monto, cuenta y fecha cercana
      const gastosRelacionados = await prisma.gasto.findMany({
        where: {
          concepto: conceptoGasto,
          monto: movimiento.precio,
          cuentaId: movimiento.cuentaId,
          categoria: 'Insumos',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      console.log(`📋 Gastos encontrados: ${gastosRelacionados.length}`);
      if (gastosRelacionados.length > 0) {
        console.log('✅ Gasto a eliminar:', gastosRelacionados[0].id, gastosRelacionados[0].concepto);
      }

      // Si se encuentra un gasto relacionado, agregarlo a la transacción para eliminarlo
      if (gastosRelacionados.length > 0) {
        operations.push(
          prisma.gasto.delete({
            where: { id: gastosRelacionados[0].id },
          })
        );
      } else {
        console.log('⚠️ No se encontró gasto relacionado para eliminar');
      }
    }

    // Ejecutar todas las operaciones en transacción
    await prisma.$transaction(operations);

    res.json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ error: 'Error al eliminar movimiento' });
  }
};
