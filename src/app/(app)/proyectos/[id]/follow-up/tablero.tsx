"use client";

import { useState, useTransition } from "react";
import { editarTareas, eliminarTareas } from "./actions";
import { OPCIONES_ESTADO, type ListaRoadmapVista } from "./constantes";
import { ListaRoadmapCard } from "./lista-roadmap";
import { NuevaListaBoton } from "./nueva-lista-boton";
import { Dropdown } from "@/components/dropdown";
import { reformatEntradaHoras } from "@/lib/horas";
import { BTN_DANGER_CONFIRM_SM, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";

type CampoMasivo = "estado" | "horasEstimadas";

const INPUT =
  "w-28 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Dueño de la selección: vive por encima de las listas para que la barra de
// acciones sea una sola aunque las tareas elegidas estén en listas distintas.
export function RoadmapTablero({
  clienteId,
  listas,
}: {
  clienteId: string;
  listas: ListaRoadmapVista[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState<CampoMasivo>("estado");
  const [valor, setValor] = useState("sin_iniciar");
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Checkbox del encabezado de una lista: marca o desmarca sus tareas sin
  // tocar lo seleccionado en las otras listas.
  const toggleLista = (ids: string[], marcar: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (marcar) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  const limpiar = () => {
    setSel(new Set());
    setConfirmar(false);
    setEditando(false);
  };

  const cambiarCampo = (c: CampoMasivo) => {
    setCampo(c);
    setValor(c === "estado" ? "sin_iniciar" : "1:00");
  };

  const borrar = () =>
    start(async () => {
      await eliminarTareas([...sel]);
      limpiar();
    });

  const aplicar = () =>
    start(async () => {
      const v = campo === "horasEstimadas" ? reformatEntradaHoras(valor) || valor : valor;
      const r = await editarTareas([...sel], campo, v);
      if (!r.error) limpiar();
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* La barra aparece solo con algo seleccionado; mismo patrón que Time
          Tracking, en el mismo lugar y con las mismas acciones. */}
      {sel.size > 0 && (
        <div className="mb-3 shrink-0 space-y-2 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-4 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-dc-text">{sel.size} seleccionada(s)</span>
            {confirmar ? (
              <button type="button" onClick={borrar} disabled={pending} className={BTN_DANGER_CONFIRM_SM}>
                {pending ? "Eliminando…" : "Confirmar eliminación"}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmar(true)} className={BTN_SECONDARY_SM}>
                Eliminar seleccionadas
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!editando) cambiarCampo("estado");
                setEditando((e) => !e);
              }}
              className={BTN_SECONDARY_SM}
            >
              Editar en masa
            </button>
            <button type="button" onClick={limpiar} className={BTN_SECONDARY_SM}>
              Cancelar
            </button>
          </div>

          {editando && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-dc-muted">Cambiar</span>
              <Dropdown
                value={campo}
                onChange={(v) => cambiarCampo(v as CampoMasivo)}
                options={[
                  { value: "estado", label: "Estado" },
                  { value: "horasEstimadas", label: "Horas estimadas" },
                ]}
                className="w-44"
                ariaLabel="Campo a cambiar"
              />
              <span className="text-xs text-dc-muted">a</span>
              {campo === "estado" ? (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={OPCIONES_ESTADO}
                  className="w-44"
                  ariaLabel="Estado"
                />
              ) : (
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onBlur={() => {
                    const f = reformatEntradaHoras(valor);
                    if (f) setValor(f);
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Horas estimadas"
                  title="Cargá un número (1,5) o el formato 1:30"
                  className={INPUT}
                />
              )}
              <button type="button" onClick={aplicar} disabled={pending || !valor} className={BTN_PRIMARY_SM}>
                {pending ? "Aplicando…" : "Aplicar a seleccionadas"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        {listas.map((lista) => (
          <ListaRoadmapCard
            key={lista.id}
            lista={lista}
            sel={sel}
            onToggle={toggle}
            onToggleLista={toggleLista}
          />
        ))}

        {listas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-dc-muted">
            Este proyecto no tiene listas en el Roadmap. Agregá una para armar
            el plan de trabajo.
          </p>
        )}

        {/* Agregar va siempre al final del plan, después de la última lista. */}
        <NuevaListaBoton clienteId={clienteId} />
      </div>
    </div>
  );
}
