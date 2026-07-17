-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "duracion_meses" INTEGER,
ADD COLUMN     "fecha_inicio" DATE,
ADD COLUMN     "producto" TEXT;

-- CreateTable
CREATE TABLE "miembros_equipo" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "cumpleanos" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "miembros_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "miembros_equipo_cliente_id_idx" ON "miembros_equipo"("cliente_id");

-- AddForeignKey
ALTER TABLE "miembros_equipo" ADD CONSTRAINT "miembros_equipo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
