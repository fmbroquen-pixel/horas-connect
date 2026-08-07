-- registros_horas.tarea_id pasa de RESTRICT (default de Prisma) a SET NULL.
--
-- El Roadmap borra tareas y listas fisicamente. Con RESTRICT, borrar una
-- tarea que tuviera horas historicas apuntando a ella fallaba con un error de
-- clave foranea y la accion moria con un 500 sin mensaje. El registro de
-- horas no depende de la tarea (su dato vivo es cliente + concepto), asi que
-- lo correcto es soltar la referencia y conservar el registro.
ALTER TABLE "registros_horas" DROP CONSTRAINT "registros_horas_tarea_id_fkey";

ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_tarea_id_fkey"
  FOREIGN KEY ("tarea_id") REFERENCES "tareas_roadmap"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
