"use client";

import { FiltrosMes } from "@/components/filtros-mes";
import { useRecalculo } from "@/components/recalculo";
import { IconoProyecto } from "@/components/ui/icono-proyecto";
import { IconoOwner } from "@/components/submenu-filtro";
import type { OpcionFiltro } from "@/components/lista-proyectos";

// La barra de filtros de Home CORE y de Analytics.
//
// Las dos pantallas filtran lo mismo -mes, proyectos y Mentor Owner- y ahora
// dibujan el mismo componente, alimentado por el mismo scope del servidor. Un
// filtro nuevo se agrega acá una vez y aparece en las dos.
//
// Es de cliente porque tiene que leer el contexto de recálculo: al cambiar un
// filtro, los KPIs y los gráficos muestran su spinner en vez de quedarse con
// los números del recorte anterior como si nada.
export function FiltrosModulo({
  basePath,
  anio,
  mes,
  proyectosOpciones,
  proyectosSeleccionados,
  ownersOpciones,
  ownersSeleccionados,
}: {
  basePath: string;
  anio: number;
  mes: number;
  proyectosOpciones: OpcionFiltro[];
  proyectosSeleccionados: string[];
  ownersOpciones: OpcionFiltro[];
  ownersSeleccionados: string[];
}) {
  const { recalculando, navegar } = useRecalculo();

  return (
    <FiltrosMes
      anio={anio}
      mes={mes}
      basePath={basePath}
      filtros={[
        {
          clave: "proyectos",
          nombre: "Proyectos",
          plural: "proyectos",
          icono: (size: number) => <IconoProyecto size={size} strokeWidth={2} />,
          opciones: proyectosOpciones,
          seleccionados: proyectosSeleccionados,
        },
        {
          clave: "owners",
          nombre: "Mentor Owner",
          plural: "mentores owner",
          icono: (size: number) => <IconoOwner size={size} />,
          opciones: ownersOpciones,
          seleccionados: ownersSeleccionados,
        },
      ]}
      navegar={navegar}
      cargando={recalculando}
    />
  );
}
