// @ts-nocheck
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { prisma } from '../utils/prisma.js';

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
        'Lista facturas de proveedores con su saldo pendiente. Permite filtrar por estado (PENDIENTE, PAGO PARCIAL, PAGADA) y/o proveedor.',
      inputSchema: {
        estado: z.enum(['PENDIENTE', 'PAGO PARCIAL', 'PAGADA']).optional(),
        proveedor: z.string().optional(),
      },
    },
    async ({ estado, proveedor }) => {
      const facturas = await prisma.factura.findMany({
        where: {
          ...(estado && { estado }),
          ...(proveedor && { proveedor: { contains: proveedor, mode: 'insensitive' } }),
        },
        include: { pagos: true },
        orderBy: { fechaEmision: 'desc' },
        take: 100,
      });

      const resultado = facturas.map((f) => ({
        numeroFactura: f.numeroFactura,
        proveedor: f.proveedor,
        fechaEmision: f.fechaEmision,
        moneda: f.moneda,
        total: f.total,
        saldoRestante: getSaldoRestante(f),
        estado: f.estado,
        formaPago: f.formaPago,
        fechaPago: f.fechaPago,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'listar_gastos',
    {
      title: 'Listar gastos',
      description:
        'Lista gastos registrados. Permite filtrar por categoría (Combustible, Mantenimiento, Insumos, Salarios, Servicios, Otros) y/o rango de fechas.',
      inputSchema: {
        categoria: z.string().optional(),
        fechaDesde: z.string().optional().describe('Fecha ISO (YYYY-MM-DD)'),
        fechaHasta: z.string().optional().describe('Fecha ISO (YYYY-MM-DD)'),
      },
    },
    async ({ categoria, fechaDesde, fechaHasta }) => {
      const gastos = await prisma.gasto.findMany({
        where: {
          ...(categoria && { categoria }),
          ...((fechaDesde || fechaHasta) && {
            fecha: {
              ...(fechaDesde && { gte: new Date(fechaDesde) }),
              ...(fechaHasta && { lte: new Date(fechaHasta) }),
            },
          }),
        },
        orderBy: { fecha: 'desc' },
        take: 100,
      });

      const resultado = gastos.map((g) => ({
        concepto: g.concepto,
        categoria: g.categoria,
        monto: g.monto,
        fecha: g.fecha,
        descripcion: g.descripcion,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'consultar_stock',
    {
      title: 'Consultar stock',
      description: 'Lista el stock actual de insumos. Permite filtrar por categoría y/o nombre.',
      inputSchema: {
        categoria: z.string().optional(),
        nombre: z.string().optional(),
      },
    },
    async ({ categoria, nombre }) => {
      const stock = await prisma.stock.findMany({
        where: {
          ...(categoria && { categoria }),
          ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
        },
        orderBy: { nombre: 'asc' },
        take: 200,
      });

      const resultado = stock.map((s) => ({
        nombre: s.nombre,
        categoria: s.categoria,
        cantidad: s.cantidad,
        unidad: s.unidad,
        stockMinimo: s.stockMinimo,
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
        'Lista servicios/trabajos realizados o pendientes (siembra, cosecha, pulverización, etc). Permite filtrar por tipo y/o estado.',
      inputSchema: {
        tipo: z.string().optional(),
        estado: z.enum(['PENDIENTE', 'REALIZADO']).optional(),
      },
    },
    async ({ tipo, estado }) => {
      const servicios = await prisma.servicio.findMany({
        where: {
          ...(tipo && { tipo }),
          ...(estado && { estado }),
        },
        include: {
          campo: { select: { nombre: true } },
          lote: { select: { nombre: true } },
          contratista: { select: { nombre: true, apellido: true, empresa: true } },
        },
        orderBy: { fecha: 'desc' },
        take: 100,
      });

      const resultado = servicios.map((s) => ({
        tipo: s.tipo,
        fecha: s.fecha,
        estado: s.estado,
        campo: s.campo?.nombre,
        lote: s.lote?.nombre,
        hectareas: s.hectareas,
        contratista:
          s.contratista && (s.contratista.empresa || `${s.contratista.nombre} ${s.contratista.apellido || ''}`.trim()),
        total: s.total,
        moneda: s.moneda,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
    }
  );

  server.registerTool(
    'resumen_cuentas_corrientes',
    {
      title: 'Resumen de cuentas corrientes',
      description: 'Devuelve los totales pendientes y pagados de facturas a proveedores, en ARS y USD.',
      inputSchema: {},
    },
    async () => {
      const facturas = await prisma.factura.findMany({ include: { pagos: true } });

      const sum = (filtro) =>
        facturas.filter(filtro).reduce((acc, f) => acc + getSaldoRestante(f), 0);

      const resumen = {
        totalPendienteARS: sum((f) => f.estado !== 'PAGADA' && f.moneda === 'ARS'),
        totalPendienteUSD: sum((f) => f.estado !== 'PAGADA' && f.moneda === 'USD'),
        totalFacturas: facturas.length,
      };

      return { content: [{ type: 'text', text: JSON.stringify(resumen, null, 2) }] };
    }
  );

  return server;
}
