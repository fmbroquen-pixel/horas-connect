"use client";

import { useState, useTransition } from "react";
import { eliminarRegistros, editarRegistros, type CampoMasivo } from "./actions";
import { FilaNueva } from "./fila-nueva";
import { FilaRegistro } from "./fila-registro";
import { GRID_TIMETRACKER } from "./grid";
import { BTN_DANGER_CONFIRM_SM, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
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

  // Edición masiva: campo a cambiar y valor a aplicar.
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState<CampoMasivo>("clienteId");
  const [valor, setValor] = useState("");

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

  const limpiar = () => {
    setSel(new Set());
    setConfirmar(false);
    setEditando(false);
  };

  const borrarSeleccion = () =>
    start(async () => {
      await eliminarRegistros([...sel]);
      limpiar();
    });

  const cambiarCampo = (c: CampoMasivo) => {
    setCampo(c);
    // Valor por defecto según el campo elegido.
    if (c === "clienteId") setValor(proyectos[0]?.id ?? "");
    else if (c === "etapaId") setValor(etapas[0]?.id ?? "");
    else if (c === "ownership") setValor("owner");
    else setValor("presencial");
  };

  const aplicarEdicion = () =>
    start(async () => {
      const r = await editarRegistros([...sel], campo, valor);
      if (!r.error) limpiar();
    });

  return (
    <div>
      {sel.size > 0 && (
        <div className="mb-3 space-y-2 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-4 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
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
            <button
              type="button"
              onClick={() => {
                if (!editando) cambiarCampo("clienteId");
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
                  { value: "clienteId", label: "Proyecto" },
                  { value: "etapaId", label: "Etapa" },
                  { value: "ownership", label: "Ownership" },
                  { value: "modalidad", label: "Modalidad" },
                ]}
                className="w-40"
                ariaLabel="Campo a cambiar"
              />
              <span className="text-xs text-dc-muted">a</span>
              {campo === "clienteId" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
                  className="w-44"
                  ariaLabel="Proyecto"
                />
              )}
              {campo === "etapaId" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={etapas.map((e) => ({ value: e.id, label: e.nombre }))}
                  className="w-44"
                  ariaLabel="Etapa"
                />
              )}
              {campo === "ownership" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={[
                    { value: "owner", label: "Owner" },
                    { value: "backup", label: "Backup" },
                  ]}
                  className="w-40"
                  ariaLabel="Ownership"
                />
              )}
              {campo === "modalidad" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={[
                    { value: "presencial", label: "Presencial" },
                    { value: "virtual", label: "Virtual" },
                  ]}
                  className="w-40"
                  ariaLabel="Modalidad"
                />
              )}
              <button type="button" onClick={aplicarEdicion} disabled={pending || !valor} className={BTN_PRIMARY_SM}>
                {pending ? "Aplicando…" : "Aplicar a seleccionadas"}
              </button>
            </div>
          )}
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
