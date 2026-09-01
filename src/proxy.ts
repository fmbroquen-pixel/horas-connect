import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Se ejecuta antes de cada request (salvo los excluidos por el matcher) y
// renueva la sesión de Supabase guardada en cookies. Reemplaza al viejo
// middleware.ts (renombrado a proxy.ts en Next.js 16).
export async function proxy(request: NextRequest) {
  // La ruta actual, para los Server Components. Next no se la pasa a los
  // layouts, y el layout de la app la necesita para saber si está mostrando un
  // proyecto y, en ese caso, bajo qué sección de la sidebar corresponde.
  request.headers.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Fuerza la validación/renovación del token contra Supabase.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
