"use client";

import { useState, useTransition } from "react";
import { eliminarViaticos } from "./actions";
import { FilaViatico } from "./fila-viatico";
import { COLUMNAS_VIATICOS } from "./columnas";
import { TablaDatos } from "@/components/data-table/tabla-datos";
import { BTN_DANGER_CONFIRM_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { avisarError, avisarOk } from "@/components/ui/avisos";
import type { OpcionSelect, ViaticoFila } from "./tipos";

// La tabla de Expenses. Hermana de TablaRegistros: misma cáscara, misma
// selección, mismas acciones y mismo modo lectura, porque las dos son data
// tables. Lo que cambia son las columnas y qué se puede hacer en masa.
//
// Acá el masivo es solo eliminar. En Time Tracking además se edita en masa
// porque hay campos que tienen sentido uniformes en muchas filas —el cliente,
// el concepto—; en un viático el monto y el comprobante son de cada fila, así
// que una edición masiva no tendría qué cambiar.
export function TablaViaticos({
  filas,
  proyectos,
}: {
  filas: ViaticoFila[];
  proyectos: OpcionSelect[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();

  const todasSel = filas.length > 0 && sel.size === filas.length;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleTodas = () =>
    setSel(todasSel ? new Set() : new Set(filas.map((f) => f.id)));

  const limpiar = () => {
    setSel(new Set());
    setConfirmar(false);
  };

  const borrarSeleccion = () => {
    const cuantos = sel.size;
    start(async () => {
      const r = await eliminarViaticos([...sel]);
      limpiar();
      if (r.error) {
        avisarError(r.error);
        return;
      }
      avisarOk(
        cuantos === 1
          ? "Viático enviado a papelera"
          : `${cuantos} viáticos enviados a papelera`,
      );
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* La barra aparece solo con algo seleccionado, en el mismo lugar y con
          las mismas palabras que en Time Tracking. */}
      {sel.size > 0 && (
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-4 py-2 text-sm">
          <span className="text-dc-text">{sel.size} seleccionado(s)</span>
          {confirmar ? (
            <button
              type="button"
              onClick={borrarSeleccion}
              disabled={pending}
              className={BTN_DANGER_CONFIRM_SM}
            >
              {pending ? "Eliminando…" : "Confirmar eliminación"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className={BTN_SECONDARY_SM}
            >
              Eliminar seleccionados
            </button>
          )}
          <button type="button" onClick={limpiar} className={BTN_SECONDARY_SM}>
            Cancelar
          </button>
        </div>
      )}

      <TablaDatos
        columnas={COLUMNAS_VIATICOS}
        vacia={filas.length === 0}
        mensajeVacio="No hay viáticos cargados para el filtro elegido."
        encabezadoSeleccion={
          <input
            type="checkbox"
            checked={todasSel}
            onChange={toggleTodas}
            disabled={filas.length === 0}
            className="h-4 w-4 accent-dc-purple"
            aria-label="Seleccionar todo"
          />
        }
      >
        {filas.map((f) => (
          <FilaViatico
            key={f.id}
            viatico={f}
            proyectos={proyectos}
            seleccionado={sel.has(f.id)}
            onToggle={toggle}
          />
        ))}
      </TablaDatos>
    </div>
  );
}
