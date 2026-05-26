-- Agregar campo hectareasGrupo a rendimientos
ALTER TABLE "rendimientos" ADD COLUMN IF NOT EXISTS "hectareasGrupo" DOUBLE PRECISION;
