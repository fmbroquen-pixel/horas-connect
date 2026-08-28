"use client";

import { SelectorMes } from "@/components/selector-mes";
import { useRecalculo } from "@/components/recalculo";

export { SelectorMes } from "@/components/selector-mes";

// El selector de Analytics, conectado al recálculo de la pantalla: al cambiar
// de mes, los KPIs, los gráficos y las tablas muestran su spinner en vez de
// quedarse con los números del mes anterior como si nada.
export function SelectorMesAnalytics({
  anio,
  mes,
}: {
  anio: number;
  mes: number;
}) {
  const { navegar } = useRecalculo();
  return (
    <SelectorMes anio={anio} mes={mes} basePath="/rentabilidad" navegar={navegar} />
  );
}
