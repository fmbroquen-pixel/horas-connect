-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('USD', 'ARS');

-- CreateEnum
CREATE TYPE "ConceptoViatico" AS ENUM ('combustible', 'alojamiento', 'traslado', 'almuerzo', 'otros');

-- CreateTable
CREATE TABLE "viaticos" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "etapa_id" TEXT,
    "moneda" "Moneda" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "concepto" "ConceptoViatico" NOT NULL,
    "archivo_path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viaticos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "dias" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "viaticos_usuario_id_fecha_idx" ON "viaticos"("usuario_id", "fecha");

-- CreateIndex
CREATE INDEX "viaticos_cliente_id_fecha_idx" ON "viaticos"("cliente_id", "fecha");

-- CreateIndex
CREATE INDEX "vacaciones_usuario_id_fecha_inicio_idx" ON "vacaciones"("usuario_id", "fecha_inicio");

-- AddForeignKey
ALTER TABLE "viaticos" ADD CONSTRAINT "viaticos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaticos" ADD CONSTRAINT "viaticos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaticos" ADD CONSTRAINT "viaticos_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "temas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacaciones" ADD CONSTRAINT "vacaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

