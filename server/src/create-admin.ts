// Script para crear usuario administrador en producción
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Cargar variables de entorno de producción
dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔌 Conectando a la base de datos...');

    // Listar todos los usuarios existentes
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        usuario: true,
        email: true,
        rol: true,
        activo: true,
      }
    });

    console.log('\n📋 Usuarios existentes en la base de datos:');
    existingUsers.forEach(u => {
      console.log(`  - ${u.usuario} (${u.email}) - Rol: ${u.rol} - Activo: ${u.activo}`);
    });

    // Verificar si ya existe el usuario 'admin'
    const existingAdmin = await prisma.user.findUnique({
      where: { usuario: 'admin' }
    });

    if (existingAdmin) {
      console.log('\n⚠️  El usuario "admin" ya existe. Actualizando contraseña...');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      await prisma.user.update({
        where: { usuario: 'admin' },
        data: {
          password: hashedPassword,
          activo: true,
          rol: 'ADMIN',
        }
      });

      console.log('✅ Contraseña del usuario "admin" actualizada!');
      console.log('👤 Usuario: admin');
      console.log('🔑 Contraseña: admin123');
      return;
    }

    console.log('\n👤 Creando usuario administrador...');

    // Crear contraseña hasheada
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear usuario admin
    const admin = await prisma.user.create({
      data: {
        usuario: 'admin',
        email: 'admin@agroindustrias.com',
        password: hashedPassword,
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'ADMIN',
        activo: true,
      },
    });

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Usuario:', admin.usuario);
    console.log('🔑 Contraseña: admin123');
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login!');

  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .then(() => {
    console.log('\n✅ Proceso completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
