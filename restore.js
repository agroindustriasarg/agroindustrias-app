const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ============================================================
// SCRIPT DE RESTAURACIÓN
// Uso: node restore.js "G:\Mi unidad\Agroindustrias\backup_2026-03-04.json"
// ============================================================

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dERn0jl6qpiV@ep-purple-rice-ac0lt1zq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const archivoBackup = process.argv[2];
if (!archivoBackup) {
  console.error('Uso: node restore.js <ruta-del-backup.json>');
  console.error('Ejemplo: node restore.js "G:\\Mi unidad\\Agroindustrias\\backup_2026-03-04.json"');
  process.exit(1);
}

if (!fs.existsSync(archivoBackup)) {
  console.error(`Archivo no encontrado: ${archivoBackup}`);
  process.exit(1);
}

// Orden respeta las foreign keys
const ORDEN_RESTAURACION = [
  'campos', 'lotes', 'maquinarias', 'contratistas', 'cuentas',
  'stock', 'usuarios', 'proveedores',
  'movimientos_stock', 'gastos', 'servicios', 'rendimientos',
  'facturas', 'cheques', 'pagos'
];

async function restore() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.\n');

    const datos = JSON.parse(fs.readFileSync(archivoBackup, 'utf8'));

    for (const tabla of ORDEN_RESTAURACION) {
      const registros = datos[tabla];
      if (!registros || registros.length === 0) {
        console.log(`- ${tabla}: sin datos, omitida`);
        continue;
      }

      try {
        // Limpiar tabla respetando foreign keys
        await client.query(`DELETE FROM "${tabla}"`);

        // Insertar registros
        let insertados = 0;
        for (const row of registros) {
          const columnas = Object.keys(row);
          const valores = Object.values(row);
          const placeholders = columnas.map((_, i) => `$${i + 1}`).join(', ');
          const cols = columnas.map(c => `"${c}"`).join(', ');

          await client.query(
            `INSERT INTO "${tabla}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            valores
          );
          insertados++;
        }

        console.log(`✓ ${tabla}: ${insertados} registros restaurados`);
      } catch (e) {
        console.log(`✗ ${tabla}: error - ${e.message}`);
      }
    }

    console.log('\n¡Restauración completada!');

  } catch (err) {
    console.error('Error de conexión:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

restore();
