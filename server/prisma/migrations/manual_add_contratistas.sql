-- CreateTable: Contratistas
CREATE TABLE "contratistas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "empresa" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratistas_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Servicios - Agregar nuevas columnas
ALTER TABLE "servicios"
ADD COLUMN "costoPorHa" DOUBLE PRECISION,
ADD COLUMN "total" DOUBLE PRECISION,
ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN "contratistaId" TEXT;

-- Migrar datos existentes: convertir costo a costoPorHa
UPDATE "servicios"
SET "costoPorHa" = "costo",
    "total" = CASE
        WHEN "hectareas" IS NOT NULL AND "costo" IS NOT NULL
        THEN "hectareas" * "costo"
        ELSE "costo"
    END
WHERE "costo" IS NOT NULL;

-- Eliminar columna antigua
ALTER TABLE "servicios" DROP COLUMN "costo";

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_contratistaId_fkey"
FOREIGN KEY ("contratistaId") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
