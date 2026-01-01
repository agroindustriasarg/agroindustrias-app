# Guía de Instalación - Agroindustrias Argentinas SRL

## Requisitos Previos

1. **Node.js 18+** instalado
2. **PostgreSQL 18** instalado (ya lo tienes)
3. **pgAdmin 4** (ya instalado)

## Paso 1: Crear la Base de Datos

1. Abre **pgAdmin 4**
2. Conéctate al servidor PostgreSQL con tu contraseña
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `agroindustrias_db`
5. Click "Save"

## Paso 2: Configurar el Backend

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cd server
copy .env.example .env
```

2. Edita el archivo `.env` con tus credenciales de PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/agroindustrias_db"
JWT_SECRET="cambia-esto-por-algo-muy-seguro-y-aleatorio"
PORT=3000
NODE_ENV=development
```

**IMPORTANTE**: Reemplaza `TU_CONTRASEÑA` con la contraseña que configuraste en PostgreSQL.

## Paso 3: Instalar Dependencias

Desde la raíz del proyecto:

```bash
npm install
```

Esto instalará las dependencias del proyecto raíz y de los workspaces (client y server).

## Paso 4: Configurar Prisma y Base de Datos

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

Esto creará todas las tablas en PostgreSQL.

## Paso 5: Crear un Usuario Administrador (Opcional)

Para crear el primer usuario administrador, puedes usar Prisma Studio:

```bash
cd server
npx prisma studio
```

Esto abrirá una interfaz web donde puedes:
1. Ir a la tabla "User"
2. Crear un nuevo usuario manualmente
3. Usar una contraseña hasheada con bcrypt (o créala desde la app)

## Paso 6: Iniciar la Aplicación

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto iniciará:
- **Backend** en http://localhost:3000
- **Frontend** en http://localhost:5173

## Paso 7: Acceder a la Aplicación

1. Abre tu navegador en: http://localhost:5173
2. Verás la pantalla de login
3. Si no tienes usuario, necesitas crear uno usando Prisma Studio o modificando el código para permitir registro público

## Comandos Útiles

- `npm run dev` - Inicia frontend y backend
- `npm run dev:server` - Solo backend
- `npm run dev:client` - Solo frontend
- `cd server && npx prisma studio` - Abre interfaz para ver la BD
- `cd server && npx prisma migrate dev` - Crear nueva migración

## Solución de Problemas

### Error de conexión a PostgreSQL

Si ves error "Connection refused":
1. Verifica que PostgreSQL esté corriendo
2. Verifica la contraseña en el archivo `.env`
3. Verifica que el puerto sea 5432

### Error "Module not found"

Ejecuta `npm install` desde la raíz del proyecto.

### Puerto ya en uso

Si el puerto 3000 o 5173 está en uso, cambia el puerto en:
- Backend: archivo `server/.env` (PORT=3001)
- Frontend: archivo `client/vite.config.ts` (port: 5174)

## Próximos Pasos

Una vez que la aplicación esté corriendo:
1. Crea tu primer usuario administrador
2. Inicia sesión
3. Empieza a cargar campos, maquinarias, etc.

Los módulos de Maquinarias, Servicios, Stock, Gastos y Reportes están listos en el backend pero requieren implementación completa del frontend (actualmente muestran "Módulo en desarrollo").
