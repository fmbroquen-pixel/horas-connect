"use client";

import { FiltrosMes } from "@/components/filtros-mes";
import { useRecalculo } from "./recalculo";

// El filtro del Home es el mismo de Time Tracking y Expenses; lo único propio
// es de dónde sale la navegación: acá pasa por el contexto de recálculo, que
// es lo que hace que los KPIs y las cards muestren su spinner mientras llega
// la consulta nueva.
export function FiltrosHome({
  anio,
  mes,
  proyectos,
  seleccionados,
}: {
  anio: number;
  mes: number;
  proyectos: { id: string; nombre: string }[];
  seleccionados: string[];
}) {
  const { recalculando, navegar } = useRecalculo();

  return (
    <FiltrosMes
      anio={anio}
      mes={mes}
      basePath="/dashboard"
      opciones={proyectos}
      seleccionados={seleccionados}
      navegar={navegar}
      cargando={recalculando}
    />
  );
}
