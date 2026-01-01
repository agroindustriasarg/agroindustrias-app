-- CreateTable: Cuentas
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titular" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_nombre_key" ON "cuentas"("nombre");

-- AlterTable: Gastos - Agregar cuentaId
ALTER TABLE "gastos"
ADD COLUMN "cuentaId" TEXT;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_cuentaId_fkey"
FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert Initial Accounts
INSERT INTO "cuentas" ("id", "nombre", "tipo", "titular", "descripcion", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Empresa', 'EMPRESA', NULL, 'Cuenta de la empresa Agroindustrias Argentinas SRL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Julio Colombres', 'PERSONAL', 'Julio Colombres', 'Cuenta personal de Julio Colombres', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Ignacio Astiasuain', 'PERSONAL', 'Ignacio Astiasuain', 'Cuenta personal de Ignacio Astiasuain', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Terceros', 'TERCEROS', NULL, 'Gastos realizados por terceros o proveedores', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
