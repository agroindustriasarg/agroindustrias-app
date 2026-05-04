-- Redesign rendimientos: drop old table, create destinos, create new rendimientos

-- 1. Drop old rendimientos table (vacía)
DROP TABLE IF EXISTS "rendimientos";

-- 2. Create destinos table
CREATE TABLE IF NOT EXISTS "destinos" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "destinos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "destinos_nombre_key" UNIQUE ("nombre")
);

-- 3. Create new rendimientos table
CREATE TABLE "rendimientos" (
  "id" TEXT NOT NULL,
  "campana" TEXT NOT NULL,
  "campoId" TEXT NOT NULL,
  "loteId" TEXT NOT NULL,
  "cultivo" TEXT NOT NULL,
  "variedad" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL,
  "kgBrutos" DOUBLE PRECISION NOT NULL,
  "descHumedad" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "descCuerposExtranos" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "descVolatiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "kgNetos" DOUBLE PRECISION NOT NULL,
  "destinoId" TEXT,
  "numeroCTG" TEXT,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rendimientos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rendimientos_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "campos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rendimientos_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rendimientos_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "destinos"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
