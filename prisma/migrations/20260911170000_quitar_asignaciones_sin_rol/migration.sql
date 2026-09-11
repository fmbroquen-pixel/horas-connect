-- Quita las asignaciones de proyecto sin rol.
--
-- Son de antes de que existieran Owner y Backup (20 al momento de borrarlas).
-- Seguian dando permiso de carga, pero ninguna pantalla las mostraba desde que
-- se saco el aviso legacy de Settings -> Usuarios, y guardar las asignaciones
-- no las tocaba: acceso invisible e imposible de revocar desde la app.
--
-- Todos los caminos que crean asignaciones hoy les ponen rol, asi que no
-- vuelven a aparecer.
DELETE FROM "proyectos_asignados" WHERE "rol" IS NULL;
