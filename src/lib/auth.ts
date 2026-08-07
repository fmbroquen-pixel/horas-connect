import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/generated/prisma/client";

export type SesionActual =
  | { estado: "sin_sesion" }
  | { estado: "no_autorizado"; email: string }
  | { estado: "autorizado"; usuario: Usuario };

// Combina la sesión de Supabase Auth (¿quién sos?) con la lista blanca de la
// tabla `usuarios` (¿estás autorizado a entrar, y con qué rol?).
//
// Envuelta en cache() de React: son DOS viajes remotos —Supabase Auth y la
// base— y la llaman el layout de la app, el layout del proyecto y la página,
// todos en el mismo render. Sin memoizar, una pantalla pagaba la sesión tres
// veces antes de empezar a traer sus propios datos. cache() la resuelve una
// sola vez por request y no cruza pedidos, así que no hay riesgo de servirle
// a alguien la sesión de otro.
export const getSesionActual = cache(async function getSesionActual(): Promise<SesionActual> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { estado: "sin_sesion" };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email.toLowerCase() },
  });

  if (!usuario || !usuario.activo) {
    return { estado: "no_autorizado", email: user.email };
  }

  return { estado: "autorizado", usuario };
});
