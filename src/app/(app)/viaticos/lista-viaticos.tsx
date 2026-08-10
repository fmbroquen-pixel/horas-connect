"use client";

import { useState } from "react";
import { ToastOk } from "@/components/ui/toast-ok";
import { FilaViatico } from "./fila-viatico";
import type { OpcionSelect, ViaticoFila } from "./tipos";

// Las filas del historial, con el aviso de borrado.
//
// Existe como componente aparte porque la página es un Server Component y el
// toast necesita estado. Y el estado vive acá y no en la fila porque la fila
// que se elimina desaparece del listado: el aviso se iría con ella antes de
// poder leerse.
export function ListaViaticos({
  filas,
  proyectos,
}: {
  filas: ViaticoFila[];
  proyectos: OpcionSelect[];
}) {
  // El contador hace que dos borrados seguidos vuelvan a mostrar el toast: sin
  // él el estado no cambiaría y no reaparecería.
  const [borrado, setBorrado] = useState<number | null>(null);

  return (
    <>
      {filas.map((f) => (
        <FilaViatico
          key={f.id}
          viatico={f}
          proyectos={proyectos}
          onEliminado={() => setBorrado((n) => (n ?? 0) + 1)}
        />
      ))}

      <ToastOk key={borrado} show={borrado !== null} onHide={() => setBorrado(null)}>
        Viático eliminado
      </ToastOk>
    </>
  );
}
