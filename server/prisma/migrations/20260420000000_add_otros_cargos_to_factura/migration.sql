-- AlterTable: agregar campo otrosCargos a facturas
ALTER TABLE "facturas" ADD COLUMN IF NOT EXISTS "otrosCargos" DOUBLE PRECISION NOT NULL DEFAULT 0;
