"use client";

import { FiltrosMes, type OpcionFiltro } from "@/components/filtros-mes";
import { useRecalculo } from "@/components/recalculo";
import { IconoProyecto } from "@/components/ui/icono-proyecto";

// El mes de Time Tracking y Expenses, conectado al recálculo de la pantalla.
//
// Existe porque la página es un Server Component y el contexto es de cliente:
// alguien tiene que leer `navegar` y `recalculando` y pasárselos al FiltrosMes.
// Acá el menú va aparte -esas dos pantallas juntan importar, exportar, filtros
// y papelera en un único ⋮- así que este componente aporta el mes y el
// contador de proyectos filtrados. Home y Analytics usan FiltrosModulo, que sí
// trae su propio menú.
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
      filtros={[
        {
          clave: "proyectos",
          nombre: "Proyectos",
          plural: "proyectos",
          icono: (size: number) => <IconoProyecto size={size} strokeWidth={2} />,
          opciones,
          seleccionados,
        },
      ]}
      extra={extra}
      conMenu={conMenu}
      navegar={navegar}
      cargando={recalculando}
    />
  );
}
