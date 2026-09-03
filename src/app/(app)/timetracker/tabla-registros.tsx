"use client";

import { useState, useTransition } from "react";
import { eliminarRegistros, editarRegistros, type CampoMasivo } from "./actions";
import { FilaRegistro } from "./fila-registro";
import {
  COLUMNAS_TIMETRACKER,
  ESTILO_GRID_TIMETRACKER,
  GRID_TIMETRACKER,
} from "./columnas";
import { BTN_DANGER_CONFIRM_SM, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
import { avisarOk } from "@/components/ui/avisos";
import type { OpcionConcepto, OpcionSelect, RegistroFila } from "./tipos";

export function TablaRegistros({
  filas,
  proyectos,
  conceptos,
  usuarios,
}: {
  filas: RegistroFila[];
  proyectos: OpcionSelect[];
  conceptos: OpcionConcepto[];
  // A quiénes se puede reasignar un registro. Vacío para un mentor: la celda
  // de usuario se le muestra de solo lectura.
  usuarios: OpcionSelect[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();

  // Edición masiva: campo a cambiar y valor a aplicar.
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState<CampoMasivo>("clienteId");
  const [valor, setValor] = useState("");

  // Ya no hay filas cerradas: todo el historial se puede editar y borrar.
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
    setEditando(false);
  };

  const borrarSeleccion = () => {
    const cuantos = sel.size;
    start(async () => {
      await eliminarRegistros([...sel]);
      limpiar();
      avisarOk(
        cuantos === 1 ? "Hora enviada a papelera" : `${cuantos} horas enviadas a papelera`,
      );
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

      {/* Sin ancho mínimo: las tres columnas de texto reparten lo que hay y
          recortan con ellipsis, así que la tabla entra siempre. El overflow-x
          queda como último recurso para anchos por debajo de la suma de las
          columnas fijas (~660px), no como forma de convivir con el desborde. */}
      <div className="flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Encabezado fijo; solo el cuerpo scrollea. Los rótulos salen de la
              misma lista que ordena las celdas: no hay dos órdenes que puedan
              discrepar. */}
          <div
            className={`dc-thead ${GRID_TIMETRACKER} shrink-0 border-b border-dc-line px-4`}
            style={ESTILO_GRID_TIMETRACKER}
          >
            {COLUMNAS_TIMETRACKER.map((c) =>
              c.id === "seleccion" ? (
                <input
                  key={c.id}
                  type="checkbox"
                  checked={todasSel}
                  onChange={toggleTodas}
                  disabled={filas.length === 0}
                  className="h-4 w-4 accent-dc-purple"
                  aria-label="Seleccionar todo"
                />
              ) : (
                <span key={c.id} className="truncate">
                  {c.etiqueta}
                </span>
              ),
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filas.map((f) => (
              <FilaRegistro
                key={f.id}
                registro={f}
                proyectos={proyectos}
                conceptos={conceptos}
                usuarios={usuarios}
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
