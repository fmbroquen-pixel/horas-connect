-- AlterTable
ALTER TABLE "registros_horas" ADD COLUMN     "categoria_id" TEXT;

-- CreateTable
CREATE TABLE "categorias_tarea" (
    "id" TEXT NOT NULL,
    "lista" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_tarea_lista_nombre_key" ON "categorias_tarea"("lista", "nombre");

-- CreateIndex
CREATE INDEX "registros_horas_categoria_id_idx" ON "registros_horas"("categoria_id");

-- AddForeignKey
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Semilla del catálogo: un par (lista, tarea) por cada combinación distinta
-- que exista hoy en los Roadmaps. Es lo que deduplica "Office Hours", que
-- aparece cuatro veces por tablero y en todos los proyectos.
INSERT INTO "categorias_tarea" ("id", "lista", "nombre", "createdAt")
SELECT gen_random_uuid()::text, l."nombre", t."nombre", NOW()
FROM "tareas_roadmap" t
JOIN "listas_roadmap" l ON l."id" = t."lista_id"
GROUP BY l."nombre", t."nombre";

-- Migración del historial: los registros que apuntaban a una tarea concreta
-- del Roadmap pasan a apuntar a su categoría equivalente. tarea_id se
-- conserva como referencia histórica, pero deja de usarse.
UPDATE "registros_horas" r
SET "categoria_id" = c."id"
FROM "tareas_roadmap" t
JOIN "listas_roadmap" l ON l."id" = t."lista_id"
JOIN "categorias_tarea" c ON c."lista" = l."nombre" AND c."nombre" = t."nombre"
WHERE r."tarea_id" = t."id";
