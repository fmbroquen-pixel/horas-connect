-- AlterTable
ALTER TABLE "registros_horas" ADD COLUMN     "eliminado_en" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "viaticos" ADD COLUMN     "eliminado_en" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vacaciones" ADD COLUMN     "eliminado_en" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "registros_horas_eliminado_en_idx" ON "registros_horas"("eliminado_en");

-- CreateIndex
CREATE INDEX "viaticos_eliminado_en_idx" ON "viaticos"("eliminado_en");

-- CreateIndex
CREATE INDEX "vacaciones_eliminado_en_idx" ON "vacaciones"("eliminado_en");

