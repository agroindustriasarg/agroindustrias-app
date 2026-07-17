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
    const { fechaInicio, fechaFin, campoIds, loteIds, campanaId } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    if (campanaId && typeof campanaId === 'string') {
      whereClause.campanaId = campanaId;
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

    const [gastosPorCategoria, gastosDetalle] = await Promise.all([
      prisma.gasto.groupBy({
        by: ['categoria'],
        where: whereClause,
        _sum: { monto: true },
        _count: { id: true },
        orderBy: { _sum: { monto: 'desc' } },
      }),
      prisma.gasto.findMany({
        where: whereClause,
        select: { id: true, concepto: true, fecha: true, monto: true, categoria: true, descripcion: true },
        orderBy: [{ fecha: 'desc' }, { monto: 'desc' }],
      }),
    ]);

    const detalleMap: Record<string, any[]> = {};
    for (const g of gastosDetalle) {
      if (!detalleMap[g.categoria]) detalleMap[g.categoria] = [];
      detalleMap[g.categoria].push({ id: g.id, concepto: g.concepto, fecha: g.fecha, monto: g.monto, descripcion: g.descripcion });
    }

    res.json(
      gastosPorCategoria.map((cat) => ({
        categoria: cat.categoria,
        total: cat._sum.monto || 0,
        cantidad: cat._count.id,
        gastos: detalleMap[cat.categoria] || [],
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
    const { fechaInicio, fechaFin, campoIds, loteIds, campanaId } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    if (campanaId && typeof campanaId === 'string') {
      whereClause.campanaId = campanaId;
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
    const { fechaInicio, fechaFin, campoIds, loteIds, campanaId } = req.query;

    const whereClause: any = {
      categoria: { not: 'Pago' }, // Excluir pagos de reportes
    };
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    if (campanaId && typeof campanaId === 'string') {
      whereClause.campanaId = campanaId;
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
    const { fechaInicio, fechaFin, campoIds, loteIds, contratistaIds, campanaId } = req.query;

    const whereClause: any = {};
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio as string),
        lte: new Date(fechaFin as string),
      };
    }

    if (campanaId && typeof campanaId === 'string') {
      whereClause.campanaId = campanaId;
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
    const { fechaInicio, fechaFin, maquinariaIds, campoIds, loteIds, campanaId } = req.query;

    const whereClause: any = { tipo: 'SALIDA' };

    // Si se filtra por campaña, incluir movimientos directos de la campaña
    // Y también los generados por órdenes de pulverización (servicioId → servicio.campanaId)
    if (campanaId && typeof campanaId === 'string') {
      const serviciosEnCampana = await prisma.servicio.findMany({
        where: { campanaId: campanaId },
        select: { id: true },
      });
      const servicioIdsEnCampana = serviciosEnCampana.map((s: any) => s.id);
      if (!whereClause.AND) whereClause.AND = [];
      whereClause.AND.push({
        OR: [
          { campanaId: campanaId },
          { servicioId: { in: servicioIdsEnCampana } },
        ],
      });
    }
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
      select: { id: true, nombre: true, categoria: true, unidad: true, precioUnitario: true },
    });

    const stocksMap = new Map(stocks.map((s) => [s.id, s]));

    // Calcular precio promedio combinando MovimientoStock (remito) y FacturaItem (factura)
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio as string) : null;
    const fechaFinDate = fechaFin ? new Date(fechaFin as string) : null;
    if (fechaFinDate) fechaFinDate.setHours(23, 59, 59, 999);
    const referenceDate = fechaFinDate || new Date();

    // Tipo unificado de precio: { stockId, precioUnitario, cantidad, fecha }
    type PrecioEntry = { stockId: string; precioUnitario: number; cantidad: number; fecha: Date };

    // Fuente 1: MovimientoStock ENTRADA con precioUnitario (en período)
    const entradasRemito = await prisma.movimientoStock.findMany({
      where: {
        stockId: { in: stockIds },
        tipo: 'ENTRADA',
        precioUnitario: { not: null },
        ...(fechaInicioDate && fechaFinDate ? { fecha: { gte: fechaInicioDate, lte: fechaFinDate } } : {}),
      },
      select: { stockId: true, precioUnitario: true, cantidad: true, fecha: true },
    });

    // Fuente 2: FacturaItem con stockId (en período por fechaEmision de la factura)
    // precioUnitario es Float (no nullable en schema), no se filtra por null
    const itemsFactura = await prisma.facturaItem.findMany({
      where: {
        stockId: { in: stockIds },
        ...(fechaInicioDate && fechaFinDate
          ? { factura: { fechaEmision: { gte: fechaInicioDate, lte: fechaFinDate } } }
          : {}),
      },
      select: {
        stockId: true,
        precioUnitario: true,
        cantidad: true,
        factura: { select: { fechaEmision: true } },
      },
    });

    // Combinar ambas fuentes en período
    const preciosEnPeriodo: PrecioEntry[] = [
      ...entradasRemito
        .filter((e) => e.precioUnitario != null)
        .map((e) => ({ stockId: e.stockId, precioUnitario: e.precioUnitario!, cantidad: e.cantidad || 1, fecha: e.fecha })),
      ...itemsFactura
        .filter((i) => i.stockId != null && i.precioUnitario != null)
        .map((i) => ({ stockId: i.stockId!, precioUnitario: i.precioUnitario, cantidad: i.cantidad || 1, fecha: i.factura.fechaEmision })),
    ];

    // Promedio ponderado por stockId en período
    const preciosPorStock = new Map<string, { totalPrecio: number; totalCantidad: number }>();
    for (const e of preciosEnPeriodo) {
      const existing = preciosPorStock.get(e.stockId);
      if (existing) {
        existing.totalPrecio += e.precioUnitario * e.cantidad;
        existing.totalCantidad += e.cantidad;
      } else {
        preciosPorStock.set(e.stockId, { totalPrecio: e.precioUnitario * e.cantidad, totalCantidad: e.cantidad });
      }
    }

    // Fallback: buscar precio más cercano de cualquier fuente para los sin precio en período
    const sinPrecio = stockIds.filter((id) => !preciosPorStock.has(id));
    const preciosFallback = new Map<string, number>();
    if (sinPrecio.length > 0) {
      const todasEntradasRemito = await prisma.movimientoStock.findMany({
        where: { stockId: { in: sinPrecio }, tipo: 'ENTRADA', precioUnitario: { not: null } },
        select: { stockId: true, precioUnitario: true, fecha: true },
      });
      const todosItemsFactura = await prisma.facturaItem.findMany({
        where: { stockId: { in: sinPrecio } },
        select: { stockId: true, precioUnitario: true, factura: { select: { fechaEmision: true } } },
      });

      const candidatos: { stockId: string; precioUnitario: number; fecha: Date }[] = [
        ...todasEntradasRemito
          .filter((e) => e.precioUnitario != null)
          .map((e) => ({ stockId: e.stockId, precioUnitario: e.precioUnitario!, fecha: e.fecha })),
        ...todosItemsFactura
          .filter((i) => i.stockId != null && i.precioUnitario != null)
          .map((i) => ({ stockId: i.stockId!, precioUnitario: i.precioUnitario, fecha: i.factura.fechaEmision })),
      ];

      const candidatosPorStock = new Map<string, typeof candidatos>();
      for (const c of candidatos) {
        if (!candidatosPorStock.has(c.stockId)) candidatosPorStock.set(c.stockId, []);
        candidatosPorStock.get(c.stockId)!.push(c);
      }
      for (const stockId of sinPrecio) {
        const lista = candidatosPorStock.get(stockId) || [];
        if (lista.length === 0) continue;
        let best = lista[0];
        let bestDist = Math.abs(new Date(best.fecha).getTime() - referenceDate.getTime());
        for (const c of lista) {
          const dist = Math.abs(new Date(c.fecha).getTime() - referenceDate.getTime());
          if (dist < bestDist) { best = c; bestDist = dist; }
        }
        preciosFallback.set(stockId, best.precioUnitario);
      }
    }

    res.json(
      movimientos.map((m) => {
        const stock = stocksMap.get(m.stockId);
        let precioPromedio: number | null = null;
        if (preciosPorStock.has(m.stockId)) {
          const p = preciosPorStock.get(m.stockId)!;
          precioPromedio = p.totalPrecio / p.totalCantidad;
        } else if (preciosFallback.has(m.stockId)) {
          precioPromedio = preciosFallback.get(m.stockId)!;
        }
        return {
          stockId: m.stockId,
          nombre: stock?.nombre || 'Sin nombre',
          categoria: stock?.categoria || 'Sin categoría',
          unidad: stock?.unidad || 'unidad',
          cantidadConsumida: m._sum.cantidad || 0,
          cantidadMovimientos: m._count.id,
          precioPromedio,
          precioUnitario: stock?.precioUnitario ?? null,
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
    const { campana, campoIds, loteIds, cultivos, variedades } = req.query;

    const whereClause: any = {};

    if (campana) whereClause.campana = campana as string;

    if (campoIds && typeof campoIds === 'string') {
      whereClause.campoId = { in: campoIds.split(',') };
    }

    if (loteIds && typeof loteIds === 'string') {
      whereClause.loteId = { in: loteIds.split(',') };
    }

    if (cultivos && typeof cultivos === 'string') {
      whereClause.cultivo = { in: cultivos.split(',') };
    }

    if (variedades && typeof variedades === 'string') {
      const vArr = variedades.split(',').filter(v => v !== '');
      if (vArr.length > 0) whereClause.variedad = { in: vArr };
    }

    const rendimientos = await prisma.rendimiento.findMany({
      where: whereClause,
      include: { campo: true, lote: true, destino: true },
      orderBy: [{ campoId: 'asc' }, { loteId: 'asc' }, { cultivo: 'asc' }],
    });

    // Agrupar: campo > lote > cultivo+variedad
    const camposMap = new Map<string, any>();

    for (const r of rendimientos) {
      if (!camposMap.has(r.campoId)) {
        camposMap.set(r.campoId, {
          campoId: r.campoId,
          campoNombre: r.campo?.nombre || '',
          lotes: new Map<string, any>(),
        });
      }
      const campo = camposMap.get(r.campoId);

      if (!campo.lotes.has(r.loteId)) {
        campo.lotes.set(r.loteId, {
          loteId: r.loteId,
          loteNombre: r.lote?.nombre || '',
          loteHectareas: r.lote?.hectareas || 0,
          grupos: new Map<string, any>(),
        });
      }
      const lote = campo.lotes.get(r.loteId);

      const grupoKey = `${r.cultivo}||${r.variedad || ''}`;
      if (!lote.grupos.has(grupoKey)) {
        lote.grupos.set(grupoKey, {
          cultivo: r.cultivo,
          variedad: r.variedad || '',
          entregas: 0,
          totalKgBrutos: 0,
          totalKgNetos: 0,
          totalDescuentos: 0,
          grupoHectareas: r.hectareasGrupo || null,
        });
      }
      const grupo = lote.grupos.get(grupoKey);
      grupo.entregas++;
      grupo.totalKgBrutos += r.kgBrutos;
      grupo.totalKgNetos += r.kgNetos;
      grupo.totalDescuentos += (r.kgBrutos - r.kgNetos);
      if (!grupo.grupoHectareas && r.hectareasGrupo) grupo.grupoHectareas = r.hectareasGrupo;
    }

    const resultado = Array.from(camposMap.values()).map(campo => ({
      campoId: campo.campoId,
      campoNombre: campo.campoNombre,
      lotes: Array.from(campo.lotes.values()).map((lote: any) => ({
        loteId: lote.loteId,
        loteNombre: lote.loteNombre,
        loteHectareas: lote.loteHectareas,
        grupos: Array.from(lote.grupos.values()).map((g: any) => ({
          ...g,
          kgNetosPorHa: (g.grupoHectareas || lote.loteHectareas) > 0 ? g.totalKgNetos / (g.grupoHectareas || lote.loteHectareas) : null,
        })),
      })),
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener reporte de rendimientos:', error);
    res.status(500).json({ error: 'Error al obtener reporte de rendimientos' });
  }
};
