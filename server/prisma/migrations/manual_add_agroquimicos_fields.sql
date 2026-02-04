-- Manual migration: Add agroquimicos fields to stock table

ALTER TABLE "stock" ADD COLUMN IF NOT EXISTS "droga" TEXT;
ALTER TABLE "stock" ADD COLUMN IF NOT EXISTS "nombreComercial" TEXT;
ALTER TABLE "stock" ADD COLUMN IF NOT EXISTS "tipo" TEXT;
