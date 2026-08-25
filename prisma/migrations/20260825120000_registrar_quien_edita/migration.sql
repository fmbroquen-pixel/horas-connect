-- Quien edito por ultima vez un registro de horas o un viatico.
--
-- Hasta ahora updatedAt decia CUANDO se toco una fila, pero no QUIEN. Con la
-- ventana de 45 dias eso importaba menos, porque solo se podia editar lo
-- reciente; desde que se saco, todo el historial es editable y la pregunta
-- "quien cambio esto" no tenia respuesta.
--
-- Aditiva y nullable: las filas existentes quedan en NULL, que es lo correcto.
-- No se sabe quien las edito antes de que esta columna existiera, y NULL
-- significa exactamente eso. No se reescribe ninguna fila.
--
-- ON DELETE SET NULL: si se borra el usuario, el registro no se cae; solo
-- pierde la atribucion.
ALTER TABLE "registros_horas" ADD COLUMN "editado_por_id" TEXT;
ALTER TABLE "viaticos" ADD COLUMN "editado_por_id" TEXT;

ALTER TABLE "registros_horas"
  ADD CONSTRAINT "registros_horas_editado_por_id_fkey"
  FOREIGN KEY ("editado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "viaticos"
  ADD CONSTRAINT "viaticos_editado_por_id_fkey"
  FOREIGN KEY ("editado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
