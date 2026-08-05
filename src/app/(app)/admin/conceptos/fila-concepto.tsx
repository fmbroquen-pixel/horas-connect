"use client";

import { useTransition } from "react";
import { actualizarCampoConcepto, alternarActivoConcepto } from "./actions";
import { CeldaTexto } from "@/components/tabla/celda-editable";
import { BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

// Anchos fijos para Orden y Estado, y el resto para Nombre: así las tres
// columnas caen siempre en el mismo lugar y el gap generoso evita que los
// textos se lean pegados.
export const GRID_CONCEPTOS =
  "grid min-w-[560px] grid-cols-[minmax(240px,1fr)_120px_160px] items-center gap-6";

export type ConceptoFila = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
};

// Fila del catálogo con edición inline: nombre y orden se guardan solos al
// salir del campo o con Enter, igual que en Time Tracking y Roadmap.
export function FilaConcepto({ concepto }: { concepto: ConceptoFila }) {
  const [pending, start] = useTransition();

  const guardar = (campo: Parameters<typeof actualizarCampoConcepto>[1]) =>
    async (valor: string) => actualizarCampoConcepto(concepto.id, campo, valor);

  return (
    // dc-fila: realce sutil al pasar el cursor (ver globals.css).
    <div className="dc-fila border-b border-dc-line px-4 py-2 transition-colors last:border-0">
      <div className={GRID_CONCEPTOS}>
        <CeldaTexto
          valor={concepto.nombre}
          onGuardar={guardar("nombre")}
          ariaLabel="Nombre del concepto"
        />
        <CeldaTexto
          valor={String(concepto.orden)}
          onGuardar={guardar("orden")}
          ariaLabel="Orden"
        />
        {/* items-center: el badge queda centrado en el alto de la fila, a la
            misma altura que el texto de las otras columnas. */}
        <span className="flex items-center justify-center">
          {/* Baja lógica: el concepto retirado sale del desplegable pero sigue
              etiquetando las horas que ya lo usaron. */}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await alternarActivoConcepto(concepto.id, !concepto.activo);
              })
            }
            className={concepto.activo ? BTN_PILL_ON : BTN_PILL_OFF}
          >
            {concepto.activo ? "Activo" : "Inactivo"}
          </button>
        </span>
      </div>
    </div>
  );
}
