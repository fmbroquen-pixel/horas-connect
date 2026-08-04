"use client";

import { useEffect, useState, useTransition } from "react";
import { eliminarRegistros, editarRegistros, type CampoMasivo } from "./actions";
import { FilaRegistro } from "./fila-registro";
import { GRID_TIMETRACKER } from "./grid";
import { BTN_DANGER_CONFIRM_SM, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
import type {
  MapaTarifas,
  OpcionSelect,
  RegistroFila,
  TareasPorCliente,
} from "./tipos";

export function TablaRegistros({
  filas,
  proyectos,
  tareasPorCliente,
  tarifas,
}: {
  filas: RegistroFila[];
  proyectos: OpcionSelect[];
  tareasPorCliente: TareasPorCliente;
  tarifas: MapaTarifas;
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

  // Las tareas son de un solo proyecto, así que el cambio masivo de Tarea
  // solo se ofrece cuando todo lo seleccionado es del mismo cliente.
  const clientesSel = new Set(
    filas.filter((f) => sel.has(f.id)).map((f) => f.clienteId),
  );
  const clienteUnico = clientesSel.size === 1 ? [...clientesSel][0] : "";
  const tareasSel = clienteUnico ? (tareasPorCliente[clienteUnico] ?? []) : [];

  // Si la selección pasa a mezclar clientes con "Tarea" ya elegida, el campo
  // deja de ser aplicable y vuelve a Cliente.
  useEffect(() => {
    if (!clienteUnico) {
      setCampo((c) => (c === "tareaId" ? "clienteId" : c));
      setValor((v) => (campo === "tareaId" ? "" : v));
    }
  }, [clienteUnico, campo]);

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
    else if (c === "tareaId") setValor(tareasSel[0]?.id ?? "");
    else if (c === "ownership") setValor("owner");
    else setValor("presencial");
  };

  const aplicarEdicion = () =>
    start(async () => {
      const r = await editarRegistros([...sel], campo, valor);
      if (!r.error) limpiar();
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {sel.size > 0 && (
        <div className="mb-3 shrink-0 space-y-2 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-4 py-2 text-sm">
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
                  { value: "clienteId", label: "Cliente" },
                  // Solo tiene sentido con filas de un mismo proyecto.
                  ...(clienteUnico ? [{ value: "tareaId", label: "Tarea" }] : []),
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
                  ariaLabel="Cliente"
                />
              )}
              {campo === "tareaId" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={tareasSel.map((t) => ({ value: t.id, label: t.nombre }))}
                  className="w-56"
                  ariaLabel="Tarea"
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

      <div className="flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[940px] flex-1 flex-col">
          {/* Encabezado fijo; solo el cuerpo scrollea. */}
          <div className={`dc-thead ${GRID_TIMETRACKER} shrink-0 border-b border-dc-line px-4`}>
            <input
              type="checkbox"
              checked={todasSel}
              onChange={toggleTodas}
              disabled={editables.length === 0}
              className="h-4 w-4 accent-dc-purple"
              aria-label="Seleccionar todo"
            />
            <span>Fecha</span>
            <span>Cliente</span>
            <span>Tarea</span>
            <span>Ownership</span>
            <span>Horas</span>
            <span>Modalidad</span>
            <span>USD/hora</span>
            <span>USD total</span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filas.map((f) => (
              <FilaRegistro
                key={f.id}
                registro={f}
                proyectos={proyectos}
                tareasPorCliente={tareasPorCliente}
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
      </div>
    </div>
  );
}
