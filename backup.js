const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = "postgresql://neondb_owner:npg_dERn0jl6qpiV@ep-purple-rice-ac0lt1zq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const DRIVE_FOLDER = "G:\\Mi unidad\\Agroindustrias";

const TABLAS = [
  'campos', 'lotes', 'maquinarias', 'stock', 'movimientos_stock',
  'gastos', 'servicios', 'contratistas', 'cuentas', 'movimientos_cuenta',
  'rendimientos', 'usuarios', 'facturas', 'factura_items', 'cheques',
  'pagos', 'proveedores'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function backup(intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await intentarBackup();
      return;
    } catch (err) {
      console.error(`Intento ${i}/${intentos} fallido: ${err.message}`);
      if (i < intentos) {
        console.log('Reintentando en 30 segundos...');
        await sleep(30000);
      } else {
        console.error('Backup fallido después de todos los intentos.');
        process.exit(1);
      }
    }
  }
}

async function intentarBackup() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    // Crear carpeta si no existe
    if (!fs.existsSync(DRIVE_FOLDER)) {
      fs.mkdirSync(DRIVE_FOLDER, { recursive: true });
    }

    const datos = {};
    for (const tabla of TABLAS) {
      try {
        const res = await client.query(`SELECT * FROM "${tabla}"`);
        datos[tabla] = res.rows;
        console.log(`✓ ${tabla}: ${res.rows.length} registros`);
      } catch (e) {
        console.log(`- ${tabla}: no encontrada, omitida`);
      }
    }

    const fecha = new Date().toISOString().split('T')[0];
    const archivo = path.join(DRIVE_FOLDER, `backup_${fecha}.json`);

    // Eliminar backups de más de 7 días
    const archivos = fs.readdirSync(DRIVE_FOLDER).filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    archivos.sort();
    while (archivos.length >= 7) {
      const viejo = archivos.shift();
      fs.unlinkSync(path.join(DRIVE_FOLDER, viejo));
      console.log(`Eliminado backup viejo: ${viejo}`);
    }

    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
    console.log(`\nBackup guardado en: ${archivo}`);

  } catch (err) {
    await client.end().catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

backup();
