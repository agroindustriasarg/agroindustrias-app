-- CreateTable: mcp_clients (clientes OAuth registrados por el conector de Claude)
CREATE TABLE IF NOT EXISTS "mcp_clients" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_clients_pkey" PRIMARY KEY ("id")
);
