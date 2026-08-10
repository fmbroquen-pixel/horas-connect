"use client";

import { useState, useTransition } from "react";
import { eliminarRegistros, editarRegistros, type CampoMasivo } from "./actions";
import { FilaRegistro } from "./fila-registro";
import { GRID_TIMETRACKER } from "./grid";
import { BTN_DANGER_CONFIRM_SM, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
import { ToastOk } from "@/components/ui/toast-ok";
import type { OpcionConcepto, OpcionSelect, RegistroFila } from "./tipos";

export function TablaRegistros({
  filas,
  proyectos,
  conceptos,
}: {
  filas: RegistroFila[];
  proyectos: OpcionSelect[];
  conceptos: OpcionConcepto[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();
  // Aviso de borrado. Vive acá y no en la fila porque la fila que se elimina
  // desaparece del listado, y con ella se iría el toast antes de leerse. El
  // contador hace que dos borrados seguidos vuelvan a mostrarlo: sin él, el
  // estado no cambiaría y el toast no reaparecería.
  const [borrado, setBorrado] = useState<{ n: number; seq: number } | null>(null);
  const avisarBorrado = (n: number) =>
    setBorrado((b) => ({ n, seq: (b?.seq ?? 0) + 1 }));

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

  const borrarSeleccion = () => {
    const cuantos = sel.size;
    start(async () => {
      await eliminarRegistros([...sel]);
      limpiar();
      avisarBorrado(cuantos);
    });
  };

  const cambiarCampo = (c: CampoMasivo) => {
    setCampo(c);
    // Valor por defecto según el campo elegido.
    if (c === "clienteId") setValor(proyectos[0]?.id ?? "");
    else if (c === "conceptoId") setValor(conceptos[0]?.id ?? "");
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
                  { value: "conceptoId", label: "Concepto" },
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
              {campo === "conceptoId" && (
                <Dropdown
                  value={valor}
                  onChange={setValor}
                  options={conceptos.map((c) => ({ value: c.id, label: c.nombre }))}
                  className="w-52"
                  ariaLabel="Concepto"
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
            <span>Concepto</span>
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
                conceptos={conceptos}
                seleccionado={sel.has(f.id)}
                onToggle={toggle}
                onEliminado={() => avisarBorrado(1)}
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

      <ToastOk
        key={borrado?.seq}
        show={borrado !== null}
        onHide={() => setBorrado(null)}
      >
        {borrado?.n === 1
          ? "Registro eliminado"
          : `${borrado?.n} registros eliminados`}
      </ToastOk>
    </div>
  );
}
