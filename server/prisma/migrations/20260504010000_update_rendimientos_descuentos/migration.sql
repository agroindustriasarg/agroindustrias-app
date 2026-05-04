-- Actualizar campos de descuentos en rendimientos
-- Renombrar descVolatiles → descVolatil
ALTER TABLE "rendimientos" RENAME COLUMN "descVolatiles" TO "descVolatil";

-- Agregar nuevos campos de descuento
ALTER TABLE "rendimientos" ADD COLUMN IF NOT EXISTS "descQuebrados" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "rendimientos" ADD COLUMN IF NOT EXISTS "descTotalDaniados" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "rendimientos" ADD COLUMN IF NOT EXISTS "descTemperatura" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "rendimientos" ADD COLUMN IF NOT EXISTS "descGranosVerdes" DOUBLE PRECISION NOT NULL DEFAULT 0;
