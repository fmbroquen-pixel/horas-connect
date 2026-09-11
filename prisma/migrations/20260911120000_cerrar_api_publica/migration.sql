-- Cierra la API publica de Supabase sobre el schema public.
--
-- Supabase expone cada tabla de public por REST (PostgREST) a los roles anon
-- y authenticated, y por defecto les da todos los permisos: SELECT, INSERT,
-- UPDATE, DELETE y TRUNCATE. La clave de anon viaja en el navegador de
-- cualquier visitante, asi que sin RLS cualquiera podia leer o vaciar la base
-- sin pasar por la app. Se comprobo pidiendo cero filas de "conceptos" con esa
-- clave: respondio 206 con el conteo.
--
-- La app no usa esa API: lee y escribe con Prisma, conectada como postgres,
-- que es duenio de las tablas y tiene BYPASSRLS. El cliente de Supabase solo se
-- usa para login (schema auth) y archivos (schema storage), que no se tocan.
-- Por eso alcanza con RLS SIN politicas: para anon y authenticated no hay
-- ninguna fila visible, y para la app no cambia nada.
--
-- Dos capas a proposito: RLS niega las filas y el REVOKE niega la tabla. Si un
-- dia alguien crea una tabla sin RLS, el REVOKE de los permisos por defecto
-- hace que igual nazca cerrada.
--
-- service_role no se toca: es la clave del servidor, nunca sale al navegador.

BEGIN;

-- 1. RLS en todas las tablas de public, las que existen hoy. Se recorren en
--    vez de listarlas para que ninguna quede afuera por olvido.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Sin permisos sobre lo que existe.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Ni sobre lo que se cree despues. Aplica a los objetos que cree postgres,
--    que es el rol con el que corren las migraciones.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

COMMIT;
