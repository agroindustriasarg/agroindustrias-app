// @ts-nocheck
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { prisma } from '../utils/prisma.js';

const r2 = (n) => (n === null || n === undefined ? n : Math.round(n * 100) / 100);
const limiteSchema = z.number().int().positive().max(1000).optional();
const tomar = (limite) => Math.min(limite ?? 200, 1000);

// Mismo cálculo que usa el frontend (CuentasCorrientes.tsx / PagoProveedores.tsx):
// el saldo de una factura se mide siempre en la moneda de la factura.
function getSaldoRestante(factura) {
  const pagado = (factura.pagos || []).reduce(
    (suma, pf) => suma + (pf.montoUSD ?? pf.monto ?? 0),
    0
  );
  return factura.total - pagado;
}

export function crearMcpServer() {
  const server = new McpServer({ name: 'agroindustrias-app', version: '1.0.0' });

  server.registerTool(
    'listar_facturas',
    {
      title: 'Listar facturas',
      description:
        'Lista facturas de proveedores con su saldo pendiente. Filtros opcionales por estado y proveedor.',
      inputSchema: {
        estado: z.enum(['PENDIENTE', 'PAGO PARCIAL', 'PAGADA']).optional(),
        proveedor: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ estado, proveedor, limite }) => {
      const facturas = await prisma.factura.findMany({
        where: {
          ...(estado && { estado }),
          ...(proveedor && { proveedor: { contains: proveedor, mode: 'insensitive' } }),
        },
        include: { pagos: true },
        orderBy: { fechaEmision: 'desc' },
        take: tomar(limite),
      });

      const hoy = new Date();
      const resultado = facturas.map((f) => ({
        id: f.id,
        numeroFactura: f.numeroFactura,
        proveedor: f.proveedor,
        fechaEmision: f.fechaEmision,
        moneda: f.moneda,
        total: r2(f.total),
        saldoRestante: r2(getSaldoRestante(f)),
        estado: f.estado,
        formaPago: f.formaPago,
        fechaPago: f.fechaPago,
        vencida: !!(f.fechaPago && new Date(f.fechaPago) < hoy && f.estado !== 'PAGADA'),
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_gastos',
    {
      title: 'Listar gastos',
      description:
        'Lista gastos registrados (excluye la categoría interna "Pago", igual que la app). Filtros opcionales por categoría, campo, campaña y rango de fechas.',
      inputSchema: {
        categoria: z.string().optional(),
        campoId: z.string().optional(),
        campanaId: z.string().optional(),
        fechaDesde: z.string().optional().describe('Fecha ISO (YYYY-MM-DD)'),
        fechaHasta: z.string().optional().describe('Fecha ISO (YYYY-MM-DD)'),
        limite: limiteSchema,
      },
    },
    async ({ categoria, campoId, campanaId, fechaDesde, fechaHasta, limite }) => {
      const gastos = await prisma.gasto.findMany({
        where: {
          categoria: { not: 'Pago', ...(categoria && { equals: categoria }) },
          ...(campoId && { campoId }),
          ...(campanaId && { campanaId }),
          ...((fechaDesde || fechaHasta) && {
            fecha: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        include: {
          campo: { select: { nombre: true } },
          cuenta: { select: { nombre: true } },
          campana: { select: { nombre: true } },
          lotes: { include: { lote: { select: { nombre: true } } } },
        },
        orderBy: { fecha: 'desc' },
        take: tomar(limite),
      });

      const resultado = gastos.map((g) => ({
        concepto: g.concepto,
        categoria: g.categoria,
        monto: r2(g.monto),
        fecha: g.fecha,
        descripcion: g.descripcion,
        campo: g.campo?.nombre,
        lotes: g.lotes.map((gl) => gl.lote.nombre),
        cuenta: g.cuenta?.nombre,
        campana: g.campana?.nombre,
        grupoId: g.grupoId,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'consultar_stock',
    {
      title: 'Consultar stock',
      description: 'Lista el stock actual de insumos. Filtros opcionales por categoría y nombre.',
      inputSchema: {
        categoria: z.string().optional(),
        nombre: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ categoria, nombre, limite }) => {
      const stock = await prisma.stock.findMany({
        where: {
          ...(categoria && { categoria }),
          ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
        },
        orderBy: { nombre: 'asc' },
        take: tomar(limite),
      });

      const resultado = stock.map((s) => ({
        nombre: s.nombre,
        categoria: s.categoria,
        cantidad: r2(s.cantidad),
        unidad: s.unidad,
        stockMinimo: r2(s.stockMinimo),
        ubicacion: s.ubicacion,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_servicios',
    {
      title: 'Listar servicios',
      description:
        'Lista servicios/trabajos realizados o pendientes (siembra, cosecha, pulverización, etc). Filtros opcionales por tipo, estado, campo, lote, campaña y rango de fechas.',
      inputSchema: {
        tipo: z.string().optional(),
        estado: z.enum(['PENDIENTE', 'REALIZADO']).optional(),
        campoId: z.string().optional(),
        loteId: z.string().optional(),
        campanaId: z.string().optional(),
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ tipo, estado, campoId, loteId, campanaId, fechaDesde, fechaHasta, limite }) => {
      const servicios = await prisma.servicio.findMany({
        where: {
          ...(tipo && { tipo }),
          ...(estado && { estado }),
          ...(campoId && { campoId }),
          ...(loteId && { loteId }),
          ...(campanaId && { campanaId }),
          ...((fechaDesde || fechaHasta) && {
            fecha: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        include: {
          campo: { select: { nombre: true } },
          lote: { select: { nombre: true } },
          contratista: { select: { nombre: true, apellido: true, empresa: true } },
          campana: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: tomar(limite),
      });

      const resultado = servicios.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        fecha: s.fecha,
        estado: s.estado,
        campo: s.campo?.nombre,
        lote: s.lote?.nombre,
        hectareas: r2(s.hectareas),
        costoPorHa: r2(s.costoPorHa),
        contratista:
          s.contratista && (s.contratista.empresa || `${s.contratista.nombre} ${s.contratista.apellido || ''}`.trim()),
        total: r2(s.total),
        moneda: s.moneda,
        campana: s.campana?.nombre,
        facturaId: s.facturaId,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'resumen_cuentas_corrientes',
    {
      title: 'Resumen de cuentas corrientes',
      description: 'Devuelve los totales pendientes de facturas a proveedores, en ARS y USD.',
      inputSchema: {},
    },
    async () => {
      const facturas = await prisma.factura.findMany({ include: { pagos: true } });

      const sum = (filtro) =>
        facturas.filter(filtro).reduce((acc, f) => acc + getSaldoRestante(f), 0);

      const resumen = {
        totalPendienteARS: r2(sum((f) => f.estado !== 'PAGADA' && f.moneda === 'ARS')),
        totalPendienteUSD: r2(sum((f) => f.estado !== 'PAGADA' && f.moneda === 'USD')),
        totalFacturas: facturas.length,
      };

      return { content: [{ type: 'text', text: JSON.stringify(resumen, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_campos_y_lotes',
    {
      title: 'Listar campos y lotes',
      description: 'Lista los campos con sus lotes (hectáreas, cultivo, estado).',
      inputSchema: { limite: limiteSchema },
    },
    async ({ limite }) => {
      const campos = await prisma.campo.findMany({
        include: { lotes: true },
        orderBy: { nombre: 'asc' },
        take: tomar(limite),
      });

      const resultado = campos.map((c) => ({
        nombre: c.nombre,
        hectareas: r2(c.hectareas),
        activo: c.activo,
        lotes: c.lotes.map((l) => ({
          nombre: l.nombre,
          hectareas: r2(l.hectareas),
          cultivo: l.cultivo,
          estado: l.estado,
        })),
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_ventas',
    {
      title: 'Listar ventas de granos',
      description:
        'Lista ventas y canjes de granos. Filtros opcionales por campaña, campo, tipo de grano y rango de fechas.',
      inputSchema: {
        campanaId: z.string().optional(),
        campoId: z.string().optional(),
        grano: z.string().optional(),
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ campanaId, campoId, grano, fechaDesde, fechaHasta, limite }) => {
      const ventas = await prisma.ventaGrano.findMany({
        where: {
          ...(campanaId && { campanaId }),
          ...(campoId && { campoId }),
          ...(grano && { grano }),
          ...((fechaDesde || fechaHasta) && {
            fecha: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        include: {
          campana: { select: { nombre: true } },
          campo: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: tomar(limite),
      });

      const resultado = ventas.map((v) => ({
        tipo: v.tipo,
        fecha: v.fecha,
        grano: v.grano,
        kgEntregados: r2(v.kgEntregados),
        precioTn: r2(v.precioTn),
        monedaPrecio: v.monedaPrecio,
        flete: r2(v.fleteTn),
        retenciones: r2(v.retenciones),
        deducciones: r2(v.deducciones),
        importeNeto: r2(v.importeNeto),
        destino: v.destino,
        campana: v.campana?.nombre,
        campo: v.campo?.nombre,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_rendimientos',
    {
      title: 'Listar rendimientos',
      description: 'Lista rendimientos de cosecha. Filtros opcionales por campaña, campo, lote y cultivo.',
      inputSchema: {
        campana: z.string().optional(),
        campoId: z.string().optional(),
        loteId: z.string().optional(),
        cultivo: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ campana, campoId, loteId, cultivo, limite }) => {
      const rendimientos = await prisma.rendimiento.findMany({
        where: {
          ...(campana && { campana }),
          ...(campoId && { campoId }),
          ...(loteId && { loteId }),
          ...(cultivo && { cultivo }),
        },
        include: {
          campo: { select: { nombre: true } },
          lote: { select: { nombre: true } },
          destino: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: tomar(limite),
      });

      const resultado = rendimientos.map((r) => ({
        campana: r.campana,
        campo: r.campo?.nombre,
        lote: r.lote?.nombre,
        cultivo: r.cultivo,
        variedad: r.variedad,
        kgBrutos: r2(r.kgBrutos),
        kgNetos: r2(r.kgNetos),
        hectareasGrupo: r2(r.hectareasGrupo),
        destino: r.destino?.nombre,
        fecha: r.fecha,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_campanas',
    {
      title: 'Listar campañas',
      description: 'Lista las campañas agrícolas registradas.',
      inputSchema: { limite: limiteSchema },
    },
    async ({ limite }) => {
      const campanas = await prisma.campana.findMany({
        orderBy: { nombre: 'asc' },
        take: tomar(limite),
      });

      const resultado = campanas.map((c) => ({ id: c.id, nombre: c.nombre, cultivo: c.cultivo, anio: c.anio }));
      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'movimientos_stock',
    {
      title: 'Movimientos de stock',
      description:
        'Lista movimientos de entrada/salida de stock. Filtros opcionales por producto (id o nombre), tipo y rango de fechas.',
      inputSchema: {
        stockId: z.string().optional(),
        nombreProducto: z.string().optional(),
        tipo: z.enum(['ENTRADA', 'SALIDA']).optional(),
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ stockId, nombreProducto, tipo, fechaDesde, fechaHasta, limite }) => {
      let stockIdWhere = stockId;
      if (!stockIdWhere && nombreProducto) {
        const stocks = await prisma.stock.findMany({
          where: { nombre: { contains: nombreProducto, mode: 'insensitive' } },
          select: { id: true },
        });
        stockIdWhere = { in: stocks.map((s) => s.id) };
      }

      const movimientos = await prisma.movimientoStock.findMany({
        where: {
          ...(stockIdWhere && { stockId: stockIdWhere }),
          ...(tipo && { tipo }),
          ...((fechaDesde || fechaHasta) && {
            fecha: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        include: {
          stock: { select: { nombre: true } },
          cuenta: { select: { nombre: true } },
          campana: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: tomar(limite),
      });

      const campoIds = [...new Set(movimientos.map((m) => m.campoId).filter(Boolean))];
      const loteIds = [...new Set(movimientos.map((m) => m.loteId).filter(Boolean))];
      const [campos, lotes] = await Promise.all([
        campoIds.length
          ? prisma.campo.findMany({ where: { id: { in: campoIds } }, select: { id: true, nombre: true } })
          : [],
        loteIds.length
          ? prisma.lote.findMany({ where: { id: { in: loteIds } }, select: { id: true, nombre: true } })
          : [],
      ]);
      const campoMap = new Map(campos.map((c) => [c.id, c.nombre]));
      const loteMap = new Map(lotes.map((l) => [l.id, l.nombre]));

      const resultado = movimientos.map((m) => ({
        producto: m.stock.nombre,
        tipo: m.tipo,
        cantidad: r2(m.cantidad),
        fecha: m.fecha,
        motivo: m.motivo,
        precioUnitario: r2(m.precioUnitario),
        proveedor: m.proveedor,
        numeroRemito: m.numeroRemito,
        servicioId: m.servicioId,
        campo: m.campoId ? campoMap.get(m.campoId) : undefined,
        lote: m.loteId ? loteMap.get(m.loteId) : undefined,
        campana: m.campana?.nombre,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'detalle_servicio',
    {
      title: 'Detalle de un servicio',
      description:
        'Devuelve el detalle completo de un servicio por id, incluida la receta (Pulverización) y la factura vinculada.',
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const s = await prisma.servicio.findUnique({
        where: { id },
        include: {
          campo: { select: { nombre: true } },
          lote: { select: { nombre: true } },
          maquinaria: { select: { nombre: true } },
          contratista: { select: { nombre: true, apellido: true, empresa: true } },
          campana: { select: { nombre: true } },
          factura: { select: { numeroFactura: true, estado: true, total: true, moneda: true } },
        },
      });

      if (!s) {
        return { content: [{ type: 'text', text: 'No se encontró un servicio con ese id.' }], isError: true };
      }

      let receta = null;
      if (s.receta) {
        try {
          receta = JSON.parse(s.receta);
        } catch {
          receta = s.receta;
        }
      }

      const resultado = {
        id: s.id,
        tipo: s.tipo,
        fecha: s.fecha,
        estado: s.estado,
        campo: s.campo?.nombre,
        lote: s.lote?.nombre,
        maquinaria: s.maquinaria?.nombre,
        contratista:
          s.contratista && (s.contratista.empresa || `${s.contratista.nombre} ${s.contratista.apellido || ''}`.trim()),
        campana: s.campana?.nombre,
        hectareas: r2(s.hectareas),
        costoPorHa: r2(s.costoPorHa),
        costo: r2(s.total),
        moneda: s.moneda,
        receta,
        variedad: s.variedad,
        tipoFertilizante: s.tipoFertilizante,
        dosisKgHa: r2(s.dosisKgHa),
        caldo: r2(s.caldo),
        descripcion: s.descripcion,
        factura: s.factura,
      };

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_pagos',
    {
      title: 'Listar pagos',
      description: 'Lista pagos a proveedores, con la cuenta usada y las facturas a las que se imputó cada pago.',
      inputSchema: {
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ fechaDesde, fechaHasta, limite }) => {
      const pagos = await prisma.pago.findMany({
        where: {
          ...((fechaDesde || fechaHasta) && {
            fechaPago: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        include: {
          cuenta: { select: { nombre: true } },
          facturas: { include: { factura: { select: { numeroFactura: true } } } },
        },
        orderBy: { fechaPago: 'desc' },
        take: tomar(limite),
      });

      const resultado = pagos.map((p) => ({
        cuenta: p.cuenta?.nombre,
        formaPago: p.formaPago,
        fechaPago: p.fechaPago,
        facturas: p.facturas.map((pf) => ({
          numeroFactura: pf.factura.numeroFactura,
          monto: r2(pf.monto),
          monedaPago: pf.monedaPago,
          tipoCambio: r2(pf.tipoCambio),
          montoUSD: r2(pf.montoUSD),
        })),
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_cheques',
    {
      title: 'Listar cheques',
      description: 'Lista cheques de la chequera. Filtros opcionales por estado y rango de vencimiento.',
      inputSchema: {
        estado: z.enum(['PENDIENTE', 'PAGADO']).optional(),
        vencimientoDesde: z.string().optional(),
        vencimientoHasta: z.string().optional(),
        limite: limiteSchema,
      },
    },
    async ({ estado, vencimientoDesde, vencimientoHasta, limite }) => {
      const cheques = await prisma.cheque.findMany({
        where: {
          ...(estado && { estado }),
          ...((vencimientoDesde || vencimientoHasta) && {
            fechaVencimiento: {
              ...(vencimientoDesde && { gte: new Date(vencimientoDesde) }),
              ...(vencimientoHasta && { lte: new Date(vencimientoHasta) }),
            },
          }),
        },
        orderBy: { fechaVencimiento: 'asc' },
        take: tomar(limite),
      });

      const resultado = cheques.map((c) => ({
        numeroCheque: c.numeroCheque,
        banco: c.banco,
        beneficiario: c.beneficiario,
        monto: r2(c.monto),
        moneda: c.moneda,
        fechaEmision: c.fechaEmision,
        fechaVencimiento: c.fechaVencimiento,
        cruzado: c.cruzado,
        estado: c.estado,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  return server;
}
