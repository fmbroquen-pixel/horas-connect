-- Agrupacion explicita de tareas del roadmap.
--
-- Las tareas de un mismo grupo se mueven como una unidad al recalcular la
-- secuencia. Antes el grupo se DEDUCIA de las fechas -dos tareas superpuestas
-- se leian como agrupadas- y eso ataba la regla a una propiedad del codigo en
-- vez de a un dato.
--
-- Sin backfill a proposito: coincidir de fechas ya no agrupa, asi que las
-- superposiciones que existen hoy quedan como tareas independientes, que es lo
-- que la regla nueva dice que son. Quien quiera agruparlas lo hace desde la UI.
ALTER TABLE "tareas_roadmap" ADD COLUMN "grupo_id" TEXT;

CREATE INDEX "tareas_roadmap_grupo_id_idx" ON "tareas_roadmap"("grupo_id");
