import Link from "next/link";
import { BTN_SECONDARY_SM } from "@/lib/ui";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function SelectorMes({ anio, mes }: { anio: number; mes: number }) {
  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const next = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };

  return (
    <div className="flex items-center gap-3">
      <Link href={`/rentabilidad?anio=${prev.anio}&mes=${prev.mes}`} className={BTN_SECONDARY_SM}>
        ← Anterior
      </Link>
      <span className="min-w-40 text-center font-display text-sm uppercase text-white">
        {MESES[mes - 1]} {anio}
      </span>
      <Link href={`/rentabilidad?anio=${next.anio}&mes=${next.mes}`} className={BTN_SECONDARY_SM}>
        Siguiente →
      </Link>
    </div>
  );
}
