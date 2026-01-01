import bcrypt from 'bcryptjs';
import { prisma } from './utils/prisma.js';

async function main() {
  console.log('🌱 Creando usuario administrador...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@agroindustrias.com' },
    update: {},
    create: {
      email: 'admin@agroindustrias.com',
      password: hashedPassword,
      nombre: 'Administrador',
      apellido: 'Sistema',
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log('✅ Usuario administrador creado:');
  console.log('   Email: admin@agroindustrias.com');
  console.log('   Contraseña: admin123');
  console.log('   Rol: ADMIN');
  console.log('\n⚠️  Por favor cambia la contraseña después del primer login');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
