-- CreateEnum
CREATE TYPE "TipoTarifa" AS ENUM ('fija', 'variable');

-- AlterTable
ALTER TABLE "mentores" ADD COLUMN     "tipo_tarifa" "TipoTarifa";
