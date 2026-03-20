// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

// Resumen general de gastos
export const getResumenGeneral = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Total de gastos
    const totalGastos = await prisma.gasto.aggregate({
      where: whereClause,
      _sum: { monto: true },
      _count: { id: true },
    });

    // Gastos por mes (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const gastosPorMes = await prisma.$queryRaw<Array<{ mes: string; total: number }>>`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') as mes,
        SUM(monto)::float as total
      FROM "gastos"
      WHERE fecha >= ${seisMesesAtras} AND categoria != 'Pago'
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      ORDER BY mes ASC
    `;

    // Top 5 categorías
    const topCategorias = await prisma.gasto.groupBy({
      by: ['categoria'],
      where: whereClause,
      _sum: { monto: true },
      _count: { id: true },
      orderBy: { _sum: { monto: 'desc' } },
      take: 5,
    });

    res.json({
      totalGastos: totalGastos._sum.monto || 0,
      cantidadGastos: totalGastos._count.id,
      gastosPorMes,
      topCategorias: topCategorias.map((cat) => ({
        categoria: cat.categoria,
        total: cat._sum.monto || 0,
        cantidad: cat._count.id,
      })),
    });
  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    res.status(500).json({ error: 'Error al obtener resumen general' });
  }
};

// Gastos por categoría
export const getGastosPorCategoria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, campoIds, loteIds } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Filtrar por campos
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      whereClause.campoId = { in: idsArray };
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.lotes = { some: { loteId: { in: idsArray } } };
    }

    const gastosPorCategoria = await prisma.gasto.groupBy({
      by: ['categoria'],
      where: whereClause,
      _sum: { monto: true },
      _count: { id: true },
      orderBy: { _sum: { monto: 'desc' } },
    });

    res.json(
      gastosPorCategoria.map((cat) => ({
        categoria: cat.categoria,
        total: cat._sum.monto || 0,
        cantidad: cat._count.id,
      }))
    );
  } catch (error) {
    console.error('Error al obtener gastos por categoría:', error);
    res.status(500).json({ error: 'Error al obtener gastos por categoría' });
  }
};

// Gastos por cuenta
export const getGastosPorCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, campoIds, loteIds } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Filtrar por campos
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      whereClause.campoId = { in: idsArray };
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.lotes = { some: { loteId: { in: idsArray } } };
    }

    const gastosPorCuenta = await prisma.gasto.groupBy({
      by: ['cuentaId'],
      where: whereClause,
      _sum: { monto: true },
      _count: { id: true },
      orderBy: { _sum: { monto: 'desc' } },
    });

    // Obtener nombres de cuentas
    const cuentaIds = gastosPorCuenta.map((g) => g.cuentaId).filter((id): id is string => id !== null);
    const cuentas = await prisma.cuenta.findMany({
      where: { id: { in: cuentaIds } },
      select: { id: true, nombre: true, tipo: true },
    });

    const cuentasMap = new Map(cuentas.map((c) => [c.id, c]));

    res.json(
      gastosPorCuenta
        .filter((g) => g.cuentaId !== null)
        .map((g) => {
          const cuenta = cuentasMap.get(g.cuentaId!);
          return {
            cuentaId: g.cuentaId,
            cuentaNombre: cuenta?.nombre || 'Sin nombre',
            cuentaTipo: cuenta?.tipo || 'EMPRESA',
            total: g._sum.monto || 0,
            cantidad: g._count.id,
          };
        })
    );
  } catch (error) {
    console.error('Error al obtener gastos por cuenta:', error);
    res.status(500).json({ error: 'Error al obtener gastos por cuenta' });
  }
};

// Gastos por campo
export const getGastosPorCampo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, campoIds, loteIds } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Filtrar por campos
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      whereClause.campoId = { in: idsArray };
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.lotes = { some: { loteId: { in: idsArray } } };
    }

    const gastosPorCampo = await prisma.gasto.groupBy({
      by: ['campoId'],
      where: whereClause,
      _sum: { monto: true },
      _count: { id: true },
      orderBy: { _sum: { monto: 'desc' } },
    });

    // Obtener nombres de campos
    const campoIdsResult = gastosPorCampo.map((g) => g.campoId).filter((id): id is string => id !== null);
    const campos = await prisma.campo.findMany({
      where: { id: { in: campoIdsResult } },
      select: { id: true, nombre: true, hectareas: true },
    });

    const camposMap = new Map(campos.map((c) => [c.id, c]));

    res.json(
      gastosPorCampo
        .filter((g) => g.campoId !== null)
        .map((g) => {
          const campo = camposMap.get(g.campoId!);
          return {
            campoId: g.campoId,
            campoNombre: campo?.nombre || 'Sin nombre',
            hectareas: campo?.hectareas || 0,
            total: g._sum.monto || 0,
            cantidad: g._count.id,
            costoPorHectarea: campo?.hectareas ? (g._sum.monto || 0) / campo.hectareas : 0,
          };
        })
    );
  } catch (error) {
    console.error('Error al obtener gastos por campo:', error);
    res.status(500).json({ error: 'Error al obtener gastos por campo' });
  }
};

// Servicios realizados
export const getServiciosRealizados = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, campoIds, loteIds, contratistaIds } = req.query;

    const whereClause: any = {};
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Filtrar por campos
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      whereClause.campoId = { in: idsArray };
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.loteId = { in: idsArray };
    }

    // Filtrar por contratistas
    if (contratistaIds && typeof contratistaIds === 'string') {
      const idsArray = contratistaIds.split(',');
      whereClause.contratistaId = { in: idsArray };
    }

    // Agrupar servicios por tipo y moneda
    const serviciosPorTipo = await prisma.servicio.groupBy({
      by: ['tipo', 'moneda'],
      where: whereClause,
      _sum: { total: true, hectareas: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    res.json(
      serviciosPorTipo.map((srv) => ({
        tipo: srv.tipo,
        moneda: srv.moneda,
        totalCosto: srv._sum.total || 0,
        totalHectareas: srv._sum.hectareas || 0,
        cantidad: srv._count.id,
        costoPorHectarea: srv._sum.hectareas ? (srv._sum.total || 0) / srv._sum.hectareas : 0,
      }))
    );
  } catch (error) {
    console.error('Error al obtener servicios realizados:', error);
    res.status(500).json({ error: 'Error al obtener servicios realizados' });
  }
};

// Consumo de stock (productos más consumidos)
export const getConsumoStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, maquinariaIds, campoIds, loteIds } = req.query;

    const whereClause: any = { tipo: 'SALIDA' };
    if (fechaInicio && fechaFin) {
      const fin = new Date(fechaFin as string);
      fin.setHours(23, 59, 59, 999);
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: fin,
      };
    }

    // Filtrar por maquinarias
    if (maquinariaIds && typeof maquinariaIds === 'string') {
      const idsArray = maquinariaIds.split(',');
      whereClause.OR = [
        { maquinariaId: { in: idsArray } },
        { implementoId: { in: idsArray } }
      ];
    }

    // Filtrar por campos: incluir movimientos con campoId directo
    // O vinculados a un servicio de ese campo
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      const serviciosEnCampo = await prisma.servicio.findMany({
        where: { campoId: { in: idsArray } },
        select: { id: true },
      });
      const servicioIds = serviciosEnCampo.map((s: any) => s.id);
      whereClause.OR = [
        ...(whereClause.OR || []),
        { campoId: { in: idsArray } },
        { servicioId: { in: servicioIds } },
      ];
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.loteId = { in: idsArray };
    }

    const movimientos = await prisma.movimientoStock.groupBy({
      by: ['stockId'],
      where: whereClause,
      _sum: { cantidad: true },
      _count: { id: true },
      orderBy: { _sum: { cantidad: 'desc' } },
    });

    // Obtener información de productos
    const stockIds = movimientos.map((m) => m.stockId);
    const stocks = await prisma.stock.findMany({
      where: { id: { in: stockIds } },
      select: { id: true, nombre: true, categoria: true, unidad: true },
    });

    const stocksMap = new Map(stocks.map((s) => [s.id, s]));

    res.json(
      movimientos.map((m) => {
        const stock = stocksMap.get(m.stockId);
        return {
          stockId: m.stockId,
          nombre: stock?.nombre || 'Sin nombre',
          categoria: stock?.categoria || 'Sin categoría',
          unidad: stock?.unidad || 'unidad',
          cantidadConsumida: m._sum.cantidad || 0,
          cantidadMovimientos: m._count.id,
        };
      })
    );
  } catch (error) {
    console.error('Error al obtener consumo de stock:', error);
    res.status(500).json({ error: 'Error al obtener consumo de stock' });
  }
};

// Reporte de rendimientos
export const getRendimientos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, campoIds, loteIds, cultivos } = req.query;

    const whereClause: any = {};

    if (fechaInicio && fechaFin) {
      whereClause.fechaCosecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    // Filtrar por campos
    if (campoIds && typeof campoIds === 'string') {
      const idsArray = campoIds.split(',');
      whereClause.campoId = { in: idsArray };
    }

    // Filtrar por lotes
    if (loteIds && typeof loteIds === 'string') {
      const idsArray = loteIds.split(',');
      whereClause.loteId = { in: idsArray };
    }

    // Filtrar por cultivos
    if (cultivos && typeof cultivos === 'string') {
      const cultivosArray = cultivos.split(',');
      whereClause.cultivo = { in: cultivosArray };
    }

    // Obtener rendimientos
    const rendimientos = await prisma.rendimiento.findMany({
      where: whereClause,
      orderBy: {
        fechaCosecha: 'desc',
      },
    });

    // Obtener campos para poder mostrar nombres
    const uniqueCampoIds = [...new Set(rendimientos.map(r => r.campoId))];
    const campos = await prisma.campo.findMany({
      where: {
        id: { in: uniqueCampoIds },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const camposMap = new Map(campos.map(c => [c.id, c.nombre]));

    // Agrupar rendimientos por campo y cultivo
    const rendimientosPorCampo = new Map<string, any>();

    for (const rend of rendimientos) {
      const campoId = rend.campoId;

      if (!rendimientosPorCampo.has(campoId)) {
        rendimientosPorCampo.set(campoId, {
          campoId: campoId,
          campoNombre: camposMap.get(campoId) || 'Sin nombre',
          totalSuperficie: 0,
          totalCantidad: 0,
          cultivos: new Map<string, any>(),
        });
      }

      const campo = rendimientosPorCampo.get(campoId);
      campo.totalSuperficie += rend.superficie;
      campo.totalCantidad += rend.cantidad;

      // Agrupar por cultivo dentro del campo
      if (!campo.cultivos.has(rend.cultivo)) {
        campo.cultivos.set(rend.cultivo, {
          cultivo: rend.cultivo,
          totalSuperficie: 0,
          totalCantidad: 0,
          cantidad: 0,
        });
      }

      const cultivo = campo.cultivos.get(rend.cultivo);
      cultivo.totalSuperficie += rend.superficie;
      cultivo.totalCantidad += rend.cantidad;
      cultivo.cantidad += 1;
    }

    // Convertir a array y calcular rendimientos promedios
    const resultado = Array.from(rendimientosPorCampo.values()).map((campo) => ({
      campoId: campo.campoId,
      campoNombre: campo.campoNombre,
      totalSuperficie: campo.totalSuperficie,
      totalCantidad: campo.totalCantidad,
      promedioRendimiento: campo.totalSuperficie > 0 ? campo.totalCantidad / campo.totalSuperficie : 0,
      cultivos: Array.from(campo.cultivos.values()).map((c: any) => ({
        cultivo: c.cultivo,
        totalSuperficie: c.totalSuperficie,
        totalCantidad: c.totalCantidad,
        cantidad: c.cantidad,
        promedioRendimiento: c.totalSuperficie > 0 ? c.totalCantidad / c.totalSuperficie : 0,
      })),
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener reporte de rendimientos:', error);
    res.status(500).json({ error: 'Error al obtener reporte de rendimientos' });
  }
};
