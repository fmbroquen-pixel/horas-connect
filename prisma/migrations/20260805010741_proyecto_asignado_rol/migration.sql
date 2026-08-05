-- CreateEnum
CREATE TYPE "RolProyecto" AS ENUM ('owner', 'backup');

-- AlterTable
ALTER TABLE "proyectos_asignados" ADD COLUMN     "rol" "RolProyecto";

-- CreateIndex
CREATE INDEX "proyectos_asignados_cliente_id_rol_idx" ON "proyectos_asignados"("cliente_id", "rol");

-- Un único Mentor Owner por proyecto, garantizado por la base y no solo por
-- la aplicación. Es un índice único PARCIAL (solo sobre las filas con rol
-- 'owner'), que Prisma no puede expresar en el schema: los backups y las
-- filas sin rol quedan fuera y pueden repetirse por cliente.
CREATE UNIQUE INDEX "proyectos_asignados_owner_unico_por_cliente"
  ON "proyectos_asignados" ("cliente_id")
  WHERE "rol" = 'owner';
