"use client";

import { InfoButton } from "@/components/info-button";
import { BloqueRecalculable } from "@/components/recalculo";
import { KPI_ROTULO } from "@/components/ui/kpi-estilos";

// Una card de KPI.
//
// Un solo componente para Home CORE y Analytics. Eran dos copias con medidas
// distintas -padding, tamaño del valor, alineación del rótulo- que se fueron
// separando sin que nadie lo decidiera.
//
// El alto lo reparte la grilla: los items de una fila se estiran al alto de la
// fila. Eso ya pasaba, pero la card no lo aprovechaba, porque entre la celda y
// ella queda el envoltorio del recálculo y la cadena de `h-full` se cortaba
// ahí: la celda medía lo mismo, la card de adentro no. Por eso el envoltorio
// viene INCLUIDO acá y no lo pone quien la usa: es la única forma de que un
// KPI nuevo herede el alto sin que nadie se acuerde de dos clases.
//
// El rótulo reserva dos líneas aunque ocupe una. Sin esa reserva, "Cobrado"
// dejaba su valor una línea más arriba que el de "Hs estimadas entregadas", y
// los números de una misma fila no arrancaban a la misma altura.
export function Kpi({
  etiqueta,
  valor,
  sub,
  info,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  // Aclaración bajo el número: la moneda, el porcentaje sobre el que se
  // calcula, cuántas de esas horas son facturables.
  sub?: string;
  // Aclaración que el rótulo no puede llevar sin volverse una frase: qué entra
  // al filtro, o que Cobrado va sin IVA.
  info?: string;
  destacado?: boolean;
}) {
  return (
    <BloqueRecalculable className="h-full" claseContenido="h-full">
      <div className="flex h-full flex-col rounded-2xl border border-dc-line bg-dc-card px-4 py-3.5">
        <p className={KPI_ROTULO}>
          {etiqueta}
          {info && <InfoButton>{info}</InfoButton>}
        </p>
        <p
          className={`mt-1.5 font-display text-xl tabular-nums ${
            destacado ? "text-dc-pink" : "text-white"
          }`}
        >
          {valor}
        </p>
        {sub && <p className="mt-0.5 text-xs text-dc-peri">{sub}</p>}
      </div>
    </BloqueRecalculable>
  );
}
