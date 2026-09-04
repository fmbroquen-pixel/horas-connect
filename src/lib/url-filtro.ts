// La URL que produce el filtro de mes + los filtros de la pantalla.
//
// Aparte de los componentes porque la arman varios lugares distintos —las
// flechas del mes y cada submenú— y tienen que coincidir: si uno olvida un
// parámetro, moverse de mes borra el filtro de proyectos, o elegir un Mentor
// Owner borra el de proyectos, o al revés.

export type FiltroUrl = {
  // El nombre del parámetro: "proyectos", "owners", "usuarios".
  clave: string;
  ids: string[];
  // Cuántas opciones hay en total. Con todas elegidas el filtro no viaja: es
  // el default, y así "sin parámetro" significa siempre lo mismo.
  total: number;
};

export function urlConFiltros({
  basePath,
  parametros,
  filtros,
}: {
  basePath: string;
  // Lo que no es un filtro multiselección y hay que conservar igual: el mes, o
  // el usuario para el que un admin está cargando.
  parametros: Record<string, string | number | undefined>;
  filtros: FiltroUrl[];
}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(parametros)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  for (const f of filtros) {
    if (f.ids.length > 0 && f.ids.length < f.total) {
      params.set(f.clave, f.ids.join(","));
    } else {
      params.delete(f.clave);
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// El caso de las pantallas por mes, que son todas las que filtran.
export function urlFiltroMes({
  basePath,
  anio,
  mes,
  filtros,
  extra,
}: {
  basePath: string;
  anio: number;
  mes: number;
  filtros: FiltroUrl[];
  extra?: Record<string, string | undefined>;
}): string {
  return urlConFiltros({
    basePath,
    parametros: { anio, mes, ...(extra ?? {}) },
    filtros,
  });
}
