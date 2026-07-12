-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'reader';

-- Paso 1: agregar columnas nuevas como nullable
ALTER TABLE "usuarios" ADD COLUMN "tipo_tarifa" "TipoTarifa";
ALTER TABLE "tarifas" ADD COLUMN "usuario_id" TEXT;
ALTER TABLE "registros_horas" ADD COLUMN "usuario_id" TEXT;

-- Paso 2: migrar los datos existentes de mentores hacia usuarios, antes de
-- borrar la tabla mentores y la columna usuarios.mentor_id
UPDATE "usuarios" u
SET "tipo_tarifa" = m."tipo_tarifa"
FROM "mentores" m
WHERE u."mentor_id" = m."id";

UPDATE "tarifas" t
SET "usuario_id" = u."id"
FROM "usuarios" u
WHERE u."mentor_id" = t."mentor_id";

-- Paso 3: ahora que estan migrados, hacer NOT NULL
ALTER TABLE "tarifas" ALTER COLUMN "usuario_id" SET NOT NULL;
ALTER TABLE "registros_horas" ALTER COLUMN "usuario_id" SET NOT NULL;

-- Paso 4: borrar foreign keys viejas que apuntaban a mentor_id
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_mentor_id_fkey";
ALTER TABLE "tarifas" DROP CONSTRAINT "tarifas_mentor_id_fkey";
ALTER TABLE "registros_horas" DROP CONSTRAINT "registros_horas_mentor_id_fkey";

-- Paso 5: borrar indices viejos ligados a mentor_id
DROP INDEX "usuarios_mentor_id_key";
DROP INDEX "tarifas_mentor_id_modalidad_rol_vigente_hasta_idx";
DROP INDEX "tarifas_mentor_id_modalidad_rol_vigente_desde_key";
DROP INDEX "registros_horas_mentor_id_fecha_idx";

-- Paso 6: borrar columnas viejas
ALTER TABLE "usuarios" DROP COLUMN "mentor_id";
ALTER TABLE "tarifas" DROP COLUMN "mentor_id";
ALTER TABLE "registros_horas" DROP COLUMN "mentor_id";

-- Paso 7: borrar la tabla mentores (ya fusionada en usuarios)
DROP TABLE "mentores";

-- Paso 8: nueva tabla de proyectos asignados
CREATE TABLE "proyectos_asignados" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyectos_asignados_pkey" PRIMARY KEY ("id")
);

-- Paso 9: indices nuevos
CREATE UNIQUE INDEX "proyectos_asignados_usuario_id_cliente_id_key" ON "proyectos_asignados"("usuario_id", "cliente_id");
CREATE INDEX "tarifas_usuario_id_modalidad_rol_vigente_hasta_idx" ON "tarifas"("usuario_id", "modalidad", "rol", "vigente_hasta");
CREATE UNIQUE INDEX "tarifas_usuario_id_modalidad_rol_vigente_desde_key" ON "tarifas"("usuario_id", "modalidad", "rol", "vigente_desde");
CREATE INDEX "registros_horas_usuario_id_fecha_idx" ON "registros_horas"("usuario_id", "fecha");

-- Paso 10: foreign keys nuevas
ALTER TABLE "proyectos_asignados" ADD CONSTRAINT "proyectos_asignados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proyectos_asignados" ADD CONSTRAINT "proyectos_asignados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
