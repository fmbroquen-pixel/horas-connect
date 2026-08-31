-- Desde cuando un cliente dejo de operar.
--
-- Inactivar no es borrar: a partir de esta fecha no se le puede cargar nada
-- nuevo, pero todo lo anterior sigue existiendo y visible. Nullable: null es
-- "nunca se inactivo", y los que ya estaban inactivos al agregar el campo
-- quedan asi para que su historico no se corte por una fecha inventada.
ALTER TABLE "clientes" ADD COLUMN "inactivado_en" TIMESTAMP(3);
