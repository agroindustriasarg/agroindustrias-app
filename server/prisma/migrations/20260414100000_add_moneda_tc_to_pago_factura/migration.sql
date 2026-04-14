-- AlterTable: agregar campos monedaPago, tipoCambio, montoUSD a pagos_facturas
ALTER TABLE "pagos_facturas" ADD COLUMN IF NOT EXISTS "monedaPago" TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE "pagos_facturas" ADD COLUMN IF NOT EXISTS "tipoCambio" DOUBLE PRECISION;
ALTER TABLE "pagos_facturas" ADD COLUMN IF NOT EXISTS "montoUSD" DOUBLE PRECISION;
