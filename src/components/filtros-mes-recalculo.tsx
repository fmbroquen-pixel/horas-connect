"use client";

import { FiltrosMes, type OpcionFiltro } from "@/components/filtros-mes";
import { useRecalculo } from "@/components/recalculo";

// El filtro de mes conectado al recálculo de la pantalla.
//
// Existe porque la página es un Server Component y el contexto es de cliente:
// alguien tiene que leer `navegar` y `recalculando` y pasárselos al FiltrosMes.
// Time Tracking y Expenses usan este; el Home tiene el suyo porque además le
// pasa el menú de proyectos.
export function FiltrosMesRecalculo({
  anio,
  mes,
  basePath,
  opciones,
  seleccionados,
  extra,
  conMenu = false,
}: {
  anio: number;
  mes: number;
  basePath: string;
  opciones: OpcionFiltro[];
  seleccionados: string[];
  extra?: Record<string, string | undefined>;
  conMenu?: boolean;
}) {
  const { recalculando, navegar } = useRecalculo();

  return (
    <FiltrosMes
      anio={anio}
      mes={mes}
      basePath={basePath}
      opciones={opciones}
      seleccionados={seleccionados}
      extra={extra}
      conMenu={conMenu}
      navegar={navegar}
      cargando={recalculando}
    />
  );
}
