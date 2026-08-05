"use client";

import { useTransition } from "react";
import { actualizarCampoConcepto, alternarActivoConcepto } from "./actions";
import { CeldaTexto } from "@/components/tabla/celda-editable";
import { BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";
import { GRID_CONCEPTOS, type ConceptoFila } from "./constantes";

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
