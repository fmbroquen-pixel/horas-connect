"use client";

import { useActionState, useState } from "react";
import { actualizarConcepto, alternarActivoConcepto } from "./actions";
import type { ConceptoFila } from "./constantes";
import { SwitchEstado } from "@/components/ui/switch-estado";
import {
  BotonEditarIcono,
  BotonGuardarIcono,
  BotonCancelarIcono,
} from "@/components/ui/acciones-fila";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-center text-sm text-dc-text outline-none focus:border-dc-peri";

// Fila del catálogo, con la misma estructura que la tabla de Usuarios: mismas
// alturas, paddings, bordes y badges.
//
// A diferencia de Usuarios, el lápiz no navega a un detalle: son tres campos y
// abrirles una pantalla propia sería desproporcionado. Abre la edición sobre
// la misma fila, así la tabla se actualiza sin salir de la pantalla. El botón
// es el mismo componente y el mismo ícono, para que no se note la diferencia.
export function FilaConcepto({ concepto }: { concepto: ConceptoFila }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <FilaEdicion concepto={concepto} onCerrar={() => setEditando(false)} />;
  }

  return (
    // dc-fila: realce sutil al pasar el cursor (ver globals.css).
    <tr className="dc-fila border-b border-dc-line transition-colors last:border-0">
      <td className="px-4 py-3 text-center">
        <p className="truncate text-dc-text">{concepto.nombre}</p>
      </td>
      <td className="px-4 py-3 text-center tabular-nums text-dc-text">
        {concepto.orden}
      </td>
      <td className="px-4 py-3">
        <span className="flex justify-center">
          <SwitchEstado
            activo={concepto.activo}
            entidad="Concepto"
            alternar={alternarActivoConcepto.bind(null, concepto.id)}
            conEtiqueta={false}
          />
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex justify-center">
          <BotonEditarIcono
            onClick={() => setEditando(true)}
            label="Editar concepto"
          />
        </span>
      </td>
    </tr>
  );
}

function FilaEdicion({
  concepto,
  onCerrar,
}: {
  concepto: ConceptoFila;
  onCerrar: () => void;
}) {
  const accion = actualizarConcepto.bind(null, concepto.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) onCerrar();
      return r;
    },
    undefined,
  );

  // El formulario vive fuera de la fila (un <form> no puede envolver un <tr>)
  // y los inputs se asocian por el atributo form.
  const formId = `concepto-${concepto.id}`;

  return (
    <tr className="border-b border-dc-line bg-dc-card last:border-0">
      <td className="px-4 py-3">
        <form id={formId} action={formAction} />
        <input
          form={formId}
          name="nombre"
          defaultValue={concepto.nombre}
          aria-label="Nombre del concepto"
          autoComplete="off"
          autoFocus
          required
          className={INPUT}
        />
      </td>
      <td className="px-4 py-3">
        <input
          form={formId}
          name="orden"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          defaultValue={concepto.orden}
          aria-label="Orden"
          autoComplete="off"
          required
          className={INPUT}
        />
      </td>
      <td className="px-4 py-3">
        {/* El estado no se edita acá: se toca con el interruptor de la fila,
            que guarda solo. Tenerlo también en el formulario eran dos caminos
            para lo mismo, y el de acá exigía apretar Guardar para algo que del
            otro lado era inmediato. El valor viaja igual, sin control visible,
            para que guardar el nombre no lo pise. */}
        <input
          form={formId}
          type="hidden"
          name="activo"
          value={concepto.activo ? "activo" : "inactivo"}
        />
        <span className="flex justify-center">
          <SwitchEstado
            activo={concepto.activo}
            entidad="Concepto"
            alternar={alternarActivoConcepto.bind(null, concepto.id)}
            conEtiqueta={false}
          />
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex justify-center gap-1">
          <BotonGuardarIcono pending={pending} form={formId} />
          <BotonCancelarIcono onClick={onCerrar} />
        </span>
        {state?.error && (
          <p className="mt-1 text-center text-xs text-dc-pink" role="alert">
            {state.error}
          </p>
        )}
      </td>
    </tr>
  );
}
