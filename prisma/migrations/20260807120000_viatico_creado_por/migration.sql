-- Los viaticos pasan a distinguir dueno del gasto (usuario_id) de quien lo
-- cargo (creado_por_id), igual que los registros de horas. Sin esa
-- separacion, un viatico cargado por un admin para otra persona no deja
-- rastro de quien lo ingreso.
--
-- Se agrega nullable, se rellena y recien despues se marca NOT NULL: los
-- viaticos que ya existen fueron cargados por su propio dueno, que es la
-- unica atribucion que los datos respaldan.
ALTER TABLE "viaticos" ADD COLUMN "creado_por_id" TEXT;

UPDATE "viaticos" SET "creado_por_id" = "usuario_id" WHERE "creado_por_id" IS NULL;

ALTER TABLE "viaticos" ALTER COLUMN "creado_por_id" SET NOT NULL;

ALTER TABLE "viaticos" ADD CONSTRAINT "viaticos_creado_por_id_fkey"
  FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
