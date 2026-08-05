-- AlterTable
ALTER TABLE "listas_roadmap" ADD COLUMN     "plantilla" TEXT;

-- Backfill de la plantilla de origen sobre las listas que generó la propia
-- app: el sembrado por defecto crea "Onboarding" y "Tablero Q1..Qn". Se
-- reconoce por ese patrón; una lista creada a mano queda sin plantilla y su
-- propio nombre hace de categoría.
UPDATE "listas_roadmap" SET "plantilla" = 'Onboarding' WHERE "nombre" = 'Onboarding';
UPDATE "listas_roadmap" SET "plantilla" = 'Tablero Trimestral' WHERE "nombre" ~ '^Tablero Q[0-9]+$';

-- El catálogo se rehace con el nombre normalizado (la plantilla, si existe):
-- así "Office Hours" es UNA categoría y no una por trimestre. Se puede
-- vaciar sin perder nada porque ningún registro apunta todavía a una
-- categoría; de acá en adelante el catálogo se sincroniza desde la app.
DELETE FROM "categorias_tarea";

INSERT INTO "categorias_tarea" ("id", "lista", "nombre", "createdAt")
SELECT gen_random_uuid()::text, COALESCE(l."plantilla", l."nombre"), t."nombre", NOW()
FROM "tareas_roadmap" t
JOIN "listas_roadmap" l ON l."id" = t."lista_id"
GROUP BY COALESCE(l."plantilla", l."nombre"), t."nombre";
