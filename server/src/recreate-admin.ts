import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient();

async function recreateAdmin() {
  try {
    console.log('🔌 Conectando a la base de datos...');

    // Generar hash de contraseña
    const hash = await bcrypt.hash('admin123', 10);
    console.log('📝 Hash generado:', hash);

    // Eliminar usuario admin si existe
    await prisma.user.delete({ where: { usuario: 'admin' } }).catch(() => {
      console.log('⚠️  Usuario admin no existía');
    });

    // Crear usuario admin
    const user = await prisma.user.create({
      data: {
        usuario: 'admin',
        email: 'admin@agroindustrias.com',
        password: hash,
        nombre: 'Admin',
        apellido: 'Sistema',
        rol: 'ADMIN',
        activo: true,
      },
    });

    console.log('✅ Usuario admin creado exitosamente!');
    console.log('👤 Usuario:', user.usuario);
    console.log('📧 Email:', user.email);
    console.log('🔑 Contraseña: admin123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateAdmin();
