import Link from "next/link";
import { BTN_SECONDARY_SM } from "@/lib/ui";
import { MESES_LARGOS, esFuturo, mesAnterior, mesSiguiente } from "@/lib/mes";

// Navegación por mes: ← Anterior | MES AÑO | Siguiente →
//
// Es el filtro de período de toda la app. Reemplaza al rango de fechas libre
// porque en la práctica todo se mira por mes —el cierre, la facturación, el
// reporte de horas— y armar "del 1 al 31" a mano cada vez era trabajo para
// llegar siempre al mismo lugar.
//
// Son enlaces y no botones: cada mes es una URL propia, así se comparte, se
// vuelve con el botón de atrás y no hace falta ningún "Aplicar".
export function SelectorMes({
  anio,
  mes,
  basePath,
  // Lo que haya que conservar al cambiar de mes (el filtro de proyecto, por
  // ejemplo). Sin esto, moverse un mes borraría el resto del filtro.
  extra,
}: {
  anio: number;
  mes: number;
  basePath: string;
  extra?: Record<string, string | undefined>;
}) {
  const href = (m: { anio: number; mes: number }) => {
    const params = new URLSearchParams();
    params.set("anio", String(m.anio));
    params.set("mes", String(m.mes));
    for (const [k, v] of Object.entries(extra ?? {})) {
      if (v) params.set(k, v);
    }
    return `${basePath}?${params.toString()}`;
  };

  const prev = mesAnterior({ anio, mes });
  const next = mesSiguiente({ anio, mes });
  // Hacia atrás no hay tope: el historial completo es consultable. Hacia
  // adelante sí, porque no hay nada que ver.
  const hayFuturo = esFuturo(next);

  return (
    <div className="flex items-center gap-3">
      <Link href={href(prev)} className={BTN_SECONDARY_SM}>
        ← Anterior
      </Link>
      <span className="min-w-40 text-center font-display text-sm uppercase text-white">
        {MESES_LARGOS[mes - 1]} {anio}
      </span>
      {hayFuturo ? (
        <span
          aria-disabled
          title="No hay meses posteriores al actual"
          className={`${BTN_SECONDARY_SM} cursor-not-allowed opacity-40`}
        >
          Siguiente →
        </span>
      ) : (
        <Link href={href(next)} className={BTN_SECONDARY_SM}>
          Siguiente →
        </Link>
      )}
    </div>
  );
}
