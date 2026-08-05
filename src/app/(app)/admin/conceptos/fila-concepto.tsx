"use client";

import { useTransition } from "react";
import { actualizarCampoConcepto, alternarActivoConcepto } from "./actions";
import { CeldaTexto } from "@/components/tabla/celda-editable";
import { BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

export const GRID_CONCEPTOS =
  "grid min-w-[560px] grid-cols-[minmax(200px,1fr)_110px_140px] items-center gap-2";

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
    <div className="border-b border-dc-line px-4 py-2 last:border-0">
      <div className={GRID_CONCEPTOS}>
        <CeldaTexto
          valor={concepto.nombre}
          onGuardar={guardar("nombre")}
          ariaLabel="Nombre del concepto"
          alinear="izquierda"
        />
        <CeldaTexto
          valor={String(concepto.orden)}
          onGuardar={guardar("orden")}
          ariaLabel="Orden"
        />
        <span className="flex justify-center">
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
