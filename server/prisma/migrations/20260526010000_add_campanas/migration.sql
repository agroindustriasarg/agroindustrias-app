-- Crear tabla campanas
CREATE TABLE IF NOT EXISTS "campanas" (
  "id" TEXT NOT NULL,
  "cultivo" TEXT NOT NULL,
  "anio" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campanas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campanas_nombre_key" UNIQUE ("nombre")
);

-- Agregar campanaId a gastos
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "campanaId" TEXT;
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_campanaId_fkey"
  FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agregar campanaId a servicios
ALTER TABLE "servicios" ADD COLUMN IF NOT EXISTS "campanaId" TEXT;
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_campanaId_fkey"
  FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
