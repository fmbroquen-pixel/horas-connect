// Bajo qué subpestaña de Proyectos cae la ruta actual.
//
// Está separado de la sidebar para poder probarlo: la sidebar es un componente
// de cliente y esta decisión ya se equivocó una vez de la peor manera -se
// resolvía en el servidor, y el layout de la app no se vuelve a renderizar al
// navegar entre rutas que lo comparten, así que se quedaba con la sección de la
// pantalla anterior hasta que alguien refrescara-.

// El id del proyecto que se está mirando, o null si la ruta no es el detalle de
// uno. "inactivos" es el listado, no un proyecto.
export function idDeProyectoEnRuta(pathname: string): string | null {
  const id = /^\/proyectos\/([^/]+)/.exec(pathname)?.[1];
  return !id || id === "inactivos" ? null : id;
}

// Si la ruta es un proyecto apagado, devuelve su prefijo para que la sidebar
// marque Inactivos. Null significa "dejá la regla de siempre", que es la que
// resuelve bien todo lo demás, el proyecto activo incluido.
export function prefijoDeProyectoInactivo(
  pathname: string,
  idsInactivos: string[],
): string | null {
  const id = idDeProyectoEnRuta(pathname);
  if (id === null || !idsInactivos.includes(id)) return null;
  return `/proyectos/${id}`;
}
