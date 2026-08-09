-- Papelera del Follow Up: listas y tareas pasan de borrado fisico a borrado
-- logico, con fecha y autor, igual que horas, viaticos y vacaciones.
--
-- Borrar una lista NO marca sus tareas: la lista tapa a todo lo que cuelga de
-- ella mientras esta en la papelera, y restaurarla las devuelve con su orden
-- y sus datos intactos.
ALTER TABLE "listas_roadmap" ADD COLUMN "eliminado_en" TIMESTAMP(3);
ALTER TABLE "listas_roadmap" ADD COLUMN "eliminado_por_id" TEXT;

ALTER TABLE "tareas_roadmap" ADD COLUMN "eliminado_en" TIMESTAMP(3);
ALTER TABLE "tareas_roadmap" ADD COLUMN "eliminado_por_id" TEXT;

CREATE INDEX "listas_roadmap_eliminado_en_idx" ON "listas_roadmap"("eliminado_en");
CREATE INDEX "tareas_roadmap_eliminado_en_idx" ON "tareas_roadmap"("eliminado_en");

ALTER TABLE "listas_roadmap" ADD CONSTRAINT "listas_roadmap_eliminado_por_id_fkey"
  FOREIGN KEY ("eliminado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tareas_roadmap" ADD CONSTRAINT "tareas_roadmap_eliminado_por_id_fkey"
  FOREIGN KEY ("eliminado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
