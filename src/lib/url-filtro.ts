// La URL que produce el filtro de mes + proyectos.
//
// Aparte de los componentes porque la arman dos lugares distintos —las flechas
// del mes y el submenú de proyectos— y tienen que coincidir: si una olvida un
// parámetro, moverse de mes borra el filtro de proyectos o al revés.
export function urlFiltroMes({
  basePath,
  anio,
  mes,
  ids,
  total,
  extra,
}: {
  basePath: string;
  anio: number;
  mes: number;
  ids: string[];
  // Cuántas opciones hay en total. Con todas elegidas el filtro no viaja: es
  // el default, y así "sin parámetro" significa siempre lo mismo.
  total: number;
  extra?: Record<string, string | undefined>;
}): string {
  const params = new URLSearchParams();
  params.set("anio", String(anio));
  params.set("mes", String(mes));
  if (ids.length > 0 && ids.length < total) {
    params.set("proyectos", ids.join(","));
  }
  for (const [k, v] of Object.entries(extra ?? {})) if (v) params.set(k, v);
  return `${basePath}?${params.toString()}`;
}
