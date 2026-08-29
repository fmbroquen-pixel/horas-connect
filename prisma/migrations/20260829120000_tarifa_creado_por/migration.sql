-- Quien declaro cada tarifa.
--
-- Nullable y ON DELETE SET NULL: las filas anteriores a este campo no tienen
-- forma de saber quien las creo -se muestran sin autor en vez de atribuirselas
-- a alguien-, y borrar a un admin no puede llevarse consigo el historial de
-- tarifas de otra persona.
ALTER TABLE "tarifas" ADD COLUMN "creado_por_id" TEXT;

ALTER TABLE "tarifas"
  ADD CONSTRAINT "tarifas_creado_por_id_fkey"
  FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
