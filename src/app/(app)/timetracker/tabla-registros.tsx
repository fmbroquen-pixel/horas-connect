"use client";

import { useState, useTransition } from "react";
import { eliminarRegistros } from "./actions";
import { FilaNueva } from "./fila-nueva";
import { FilaRegistro } from "./fila-registro";
import { GRID_TIMETRACKER } from "./grid";
import { BTN_DANGER_CONFIRM_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import type { MapaTarifas, OpcionSelect, RegistroFila } from "./tipos";

export function TablaRegistros({
  filas,
  proyectos,
  etapas,
  tarifas,
  sinTarifa,
}: {
  filas: RegistroFila[];
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
  sinTarifa: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();

  const editables = filas.filter((f) => f.editable);
  const todasSel = editables.length > 0 && sel.size === editables.length;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleTodas = () =>
    setSel(todasSel ? new Set() : new Set(editables.map((f) => f.id)));

  const borrarSeleccion = () =>
    start(async () => {
      await eliminarRegistros([...sel]);
      setSel(new Set());
      setConfirmar(false);
    });

  return (
    <div>
      {sel.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-4 py-2 text-sm">
          <span className="text-dc-text">{sel.size} seleccionado(s)</span>
          {confirmar ? (
            <button type="button" onClick={borrarSeleccion} disabled={pending} className={BTN_DANGER_CONFIRM_SM}>
              {pending ? "Eliminando…" : "Confirmar eliminación"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmar(true)} className={BTN_SECONDARY_SM}>
              Eliminar seleccionados
            </button>
          )}
          <button type="button" onClick={() => { setSel(new Set()); setConfirmar(false); }} className={BTN_SECONDARY_SM}>
            Cancelar
          </button>
        </div>
      )}

      <div className="overflow-x-auto dc-panel">
        <div className={`dc-thead ${GRID_TIMETRACKER} border-b border-dc-line px-3`}>
          <input
            type="checkbox"
            checked={todasSel}
            onChange={toggleTodas}
            disabled={editables.length === 0}
            className="h-4 w-4 accent-dc-purple"
            aria-label="Seleccionar todo"
          />
          <span>Fecha</span>
          <span>Proyecto</span>
          <span>Etapa</span>
          <span>Ownership</span>
          <span>Horas</span>
          <span>Modalidad</span>
          <span>USD/hora</span>
          <span>USD total</span>
          <span />
        </div>

        {!sinTarifa && (
          <FilaNueva proyectos={proyectos} etapas={etapas} tarifas={tarifas} />
        )}

        {filas.map((f) => (
          <FilaRegistro
            key={f.id}
            registro={f}
            proyectos={proyectos}
            etapas={etapas}
            tarifas={tarifas}
            seleccionado={sel.has(f.id)}
            onToggle={toggle}
          />
        ))}

        {filas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-dc-muted">
            No hay horas cargadas para el filtro elegido.
          </p>
        )}
      </div>
    </div>
  );
}
