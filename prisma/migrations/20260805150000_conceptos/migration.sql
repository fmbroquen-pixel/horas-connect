-- El catálogo de Time Tracking deja de derivarse del Roadmap y pasa a ser una
-- lista corta y curada que administra el admin. El Roadmap planifica (fechas y
-- horas estimadas); el concepto clasifica gasto real, y por eso incluye cosas
-- que no son tareas de un plan (Traslado, Otros).
--
-- Se puede reemplazar sin migrar datos: ningún registro de horas apuntaba
-- todavía a una categoría.

ALTER TABLE "registros_horas" DROP CONSTRAINT "registros_horas_categoria_id_fkey";
DROP INDEX "registros_horas_categoria_id_idx";
ALTER TABLE "registros_horas" DROP COLUMN "categoria_id";
DROP TABLE "categorias_tarea";

-- `plantilla` existía solo para normalizar el nombre de las categorías
-- derivadas ("Tablero Q1" → "Tablero Trimestral"). Sin ese cálculo, no la lee
-- nadie.
ALTER TABLE "listas_roadmap" DROP COLUMN "plantilla";

CREATE TABLE "conceptos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conceptos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conceptos_nombre_key" ON "conceptos"("nombre");

ALTER TABLE "registros_horas" ADD COLUMN "concepto_id" TEXT;
CREATE INDEX "registros_horas_concepto_id_idx" ON "registros_horas"("concepto_id");
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_concepto_id_fkey"
    FOREIGN KEY ("concepto_id") REFERENCES "conceptos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Catálogo inicial en el orden del proceso, que dice más que el alfabético.
INSERT INTO "conceptos" ("id", "nombre", "orden", "activo", "createdAt") VALUES
    (gen_random_uuid()::text, 'Primera Quincenal',        1,  true, NOW()),
    (gen_random_uuid()::text, 'Primera Mensual',          2,  true, NOW()),
    (gen_random_uuid()::text, 'Segunda Quincenal',        3,  true, NOW()),
    (gen_random_uuid()::text, 'Segunda Mensual',          4,  true, NOW()),
    (gen_random_uuid()::text, 'Tercera Quincenal',        5,  true, NOW()),
    (gen_random_uuid()::text, 'Tercera Mensual - Cierra', 6,  true, NOW()),
    (gen_random_uuid()::text, 'Retrospectiva',            7,  true, NOW()),
    (gen_random_uuid()::text, 'Nuevo Seteo',              8,  true, NOW()),
    (gen_random_uuid()::text, 'Office Hours',             9,  true, NOW()),
    (gen_random_uuid()::text, 'Workshops',                10, true, NOW()),
    (gen_random_uuid()::text, 'Traslado',                 11, true, NOW()),
    (gen_random_uuid()::text, 'Otros',                    12, true, NOW());
