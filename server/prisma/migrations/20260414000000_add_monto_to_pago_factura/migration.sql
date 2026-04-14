-- AlterTable: agregar campo monto a pagos_facturas
ALTER TABLE "pagos_facturas" ADD COLUMN IF NOT EXISTS "monto" DOUBLE PRECISION NOT NULL DEFAULT 0;
