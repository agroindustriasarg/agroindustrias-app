# Agroindustrias Argentinas SRL - Sistema de Gestión

Sistema completo para la gestión de campos agrícolas, maquinarias, servicios, stock y gastos.

## 🌾 Características

- **Gestión de Campos y Lotes**: Administra múltiples campos con sus respectivos lotes
- **Maquinarias**: Control de maquinaria agrícola
- **Servicios**: Registro de servicios realizados
- **Stock**: Control de inventario
- **Gastos**: Seguimiento de gastos operativos
- **Reportes**: Generación de reportes y análisis
- **Multi-usuario**: Sistema de autenticación con usuarios y contraseñas

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT para autenticación

### Frontend
- React 19
- Vite
- TypeScript
- Tailwind CSS
- Lucide Icons

## 📦 Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm run install:all
```

3. Configurar variables de entorno (crear archivo `.env` en `/server`)
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/agroindustrias_db"
JWT_SECRET="tu-secreto-aqui"
PORT=3000
```

4. Ejecutar migraciones de Prisma:
```bash
cd server
npx prisma migrate dev
```

5. Iniciar la aplicación:
```bash
npm run dev
```

## 🚀 Uso

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📄 Licencia

Uso privado - Agroindustrias Argentinas SRL
