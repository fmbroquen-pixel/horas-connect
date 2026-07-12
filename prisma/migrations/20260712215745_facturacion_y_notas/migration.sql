-- CreateTable
CREATE TABLE "facturaciones" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto_usd" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_mes" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_mes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facturaciones_anio_mes_idx" ON "facturaciones"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "facturaciones_cliente_id_anio_mes_key" ON "facturaciones"("cliente_id", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "notas_mes_anio_mes_key" ON "notas_mes"("anio", "mes");

-- AddForeignKey
ALTER TABLE "facturaciones" ADD CONSTRAINT "facturaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

