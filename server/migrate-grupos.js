import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // PASO 1: Verificar estado actual
  const totalGastos = await prisma.gasto.count();
  console.log(`\n=== ESTADO ACTUAL ===`);
  console.log(`Total de gastos en la BD: ${totalGastos}`);

  // PASO 2: Buscar gastos que fueron distribuidos (tienen "% del total" en la descripción)
  const gastosDistribuidos = await prisma.gasto.findMany({
    where: {
      descripcion: { contains: 'del total' }
    },
    select: {
      id: true,
      concepto: true,
      categoria: true,
      fecha: true,
      monto: true,
      descripcion: true,
      tipoFactura: true,
      numeroFactura: true,
      cuentaId: true,
      campoId: true,
      grupoId: true,
      campo: { select: { nombre: true } }
    },
    orderBy: { fecha: 'desc' }
  });

  console.log(`Gastos con "del total" en descripción: ${gastosDistribuidos.length}`);

  if (gastosDistribuidos.length === 0) {
    console.log('No hay gastos distribuidos para migrar.');
    return;
  }

  // PASO 3: Agrupar por concepto + fecha + categoría + cuenta + tipoFactura + numeroFactura
  const grupos = new Map();

  for (const gasto of gastosDistribuidos) {
    const fechaDia = new Date(gasto.fecha).toISOString().split('T')[0];
    const clave = `${gasto.concepto}|${fechaDia}|${gasto.categoria}|${gasto.cuentaId || 'null'}|${gasto.tipoFactura || 'null'}|${gasto.numeroFactura || 'null'}`;

    if (!grupos.has(clave)) {
      grupos.set(clave, []);
    }
    grupos.get(clave).push(gasto);
  }

  // PASO 4: Mostrar los grupos encontrados (DRY RUN)
  console.log(`\n=== GRUPOS ENCONTRADOS ===`);
  let totalAMigrar = 0;

  for (const [clave, gastos] of grupos) {
    if (gastos.length > 1) {
      totalAMigrar += gastos.length;
      const montoTotal = gastos.reduce((sum, g) => sum + g.monto, 0);
      console.log(`\nGrupo: ${gastos[0].concepto} (${new Date(gastos[0].fecha).toLocaleDateString()})`);
      console.log(`  Categoría: ${gastos[0].categoria}`);
      console.log(`  Registros: ${gastos.length}`);
      console.log(`  Monto total: $${montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      for (const g of gastos) {
        console.log(`    - ${g.campo?.nombre || 'Sin campo'}: $${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })} | ${g.descripcion}`);
      }
    }
  }

  console.log(`\nTotal de gastos a migrar: ${totalAMigrar}`);

  // PASO 5: Asignar grupoId a cada grupo
  console.log(`\n=== EJECUTANDO MIGRACIÓN ===`);
  let gruposMigrados = 0;
  let gastosMigrados = 0;

  for (const [clave, gastos] of grupos) {
    if (gastos.length > 1) {
      const grupoId = crypto.randomUUID();

      const ids = gastos.map(g => g.id);

      await prisma.gasto.updateMany({
        where: {
          id: { in: ids }
        },
        data: {
          grupoId: grupoId
        }
      });

      gruposMigrados++;
      gastosMigrados += gastos.length;
      console.log(`  ✅ Grupo "${gastos[0].concepto}" - ${gastos.length} registros → grupoId: ${grupoId.substring(0, 8)}...`);
    }
  }

  // PASO 6: Verificación final
  console.log(`\n=== VERIFICACIÓN FINAL ===`);
  const totalGastosPost = await prisma.gasto.count();
  const gastosConGrupo = await prisma.gasto.count({ where: { grupoId: { not: null } } });
  const gastosSinGrupo = await prisma.gasto.count({ where: { grupoId: null } });

  console.log(`Total gastos antes: ${totalGastos}`);
  console.log(`Total gastos después: ${totalGastosPost}`);
  console.log(`Gastos con grupoId: ${gastosConGrupo}`);
  console.log(`Gastos sin grupoId: ${gastosSinGrupo}`);
  console.log(`Grupos creados: ${gruposMigrados}`);
  console.log(`Gastos migrados: ${gastosMigrados}`);

  if (totalGastos === totalGastosPost) {
    console.log(`\n✅ MIGRACIÓN EXITOSA - No se perdieron registros`);
  } else {
    console.log(`\n❌ ERROR - La cantidad de registros cambió!`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
