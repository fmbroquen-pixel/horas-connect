-- CreateEnum
CREATE TYPE "SemaforoEstado" AS ENUM ('verde', 'amarillo', 'rojo');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'en_curso', 'hecha');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "tablero_url" TEXT;

-- CreateTable
CREATE TABLE "semaforo_eventos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "estado" "SemaforoEstado" NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semaforo_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_eventos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "etapa_id" TEXT NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapa_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_proyecto" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "responsable" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "semaforo_eventos_cliente_id_createdAt_idx" ON "semaforo_eventos"("cliente_id", "createdAt");

-- CreateIndex
CREATE INDEX "etapa_eventos_cliente_id_createdAt_idx" ON "etapa_eventos"("cliente_id", "createdAt");

-- CreateIndex
CREATE INDEX "tareas_proyecto_cliente_id_fecha_inicio_idx" ON "tareas_proyecto"("cliente_id", "fecha_inicio");

-- AddForeignKey
ALTER TABLE "semaforo_eventos" ADD CONSTRAINT "semaforo_eventos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semaforo_eventos" ADD CONSTRAINT "semaforo_eventos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_eventos" ADD CONSTRAINT "etapa_eventos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_eventos" ADD CONSTRAINT "etapa_eventos_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "temas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_eventos" ADD CONSTRAINT "etapa_eventos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_proyecto" ADD CONSTRAINT "tareas_proyecto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
