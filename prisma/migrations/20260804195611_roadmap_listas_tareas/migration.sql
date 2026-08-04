-- CreateEnum
CREATE TYPE "EstadoTareaRoadmap" AS ENUM ('sin_iniciar', 'en_curso', 'no_ejecutada', 'finalizada');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "roadmap_creado_en" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "registros_horas" ADD COLUMN     "tarea_id" TEXT;

-- CreateTable
CREATE TABLE "listas_roadmap" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_roadmap" (
    "id" TEXT NOT NULL,
    "lista_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "duracion_dias" INTEGER NOT NULL,
    "horas_estimadas" DECIMAL(6,2) NOT NULL,
    "estado" "EstadoTareaRoadmap" NOT NULL DEFAULT 'sin_iniciar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listas_roadmap_cliente_id_orden_idx" ON "listas_roadmap"("cliente_id", "orden");

-- CreateIndex
CREATE INDEX "tareas_roadmap_lista_id_orden_idx" ON "tareas_roadmap"("lista_id", "orden");

-- CreateIndex
CREATE INDEX "registros_horas_tarea_id_idx" ON "registros_horas"("tarea_id");

-- AddForeignKey
ALTER TABLE "listas_roadmap" ADD CONSTRAINT "listas_roadmap_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_roadmap" ADD CONSTRAINT "tareas_roadmap_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas_roadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
