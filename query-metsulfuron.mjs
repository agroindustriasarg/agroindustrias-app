import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stocks = await prisma.stock.findMany({
  where: { nombre: { contains: 'etsulfuron', mode: 'insensitive' } }
});
console.log('Stock:', JSON.stringify(stocks));

if (stocks.length > 0) {
  const sid = stocks[0].id;

  const entradas = await prisma.movimientoStock.findMany({
    where: { stockId: sid, tipo: 'ENTRADA', precioUnitario: { not: null } },
    orderBy: { fecha: 'desc' }
  });
  console.log('Entradas con precio (remitos):', JSON.stringify(entradas.map(e => ({
    fecha: e.fecha, cantidad: e.cantidad, precioUnitario: e.precioUnitario, motivo: e.motivo, observaciones: e.observaciones
  }))));

  const facturaItems = await prisma.facturaItem.findMany({
    where: { stockId: sid },
    include: { factura: { select: { numero: true, fechaEmision: true, proveedor: true } } },
    orderBy: { factura: { fechaEmision: 'desc' } }
  });
  console.log('Items de factura:', JSON.stringify(facturaItems.map(fi => ({
    cantidad: fi.cantidad, precioUnitario: fi.precioUnitario,
    factura: fi.factura
  }))));
}

await prisma.$disconnect();
