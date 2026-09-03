"use client";

import { useState, useTransition } from "react";
import {
  editarViaticos,
  eliminarViaticos,
  type CampoMasivoViatico,
} from "./actions";
import { Dropdown } from "@/components/dropdown";
import { ETIQUETA_CONCEPTO } from "./tipos";
import { FilaViatico } from "./fila-viatico";
import { COLUMNAS_VIATICOS } from "./columnas";
import { TablaDatos } from "@/components/data-table/tabla-datos";
import {
  BTN_DANGER_CONFIRM_SM,
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
} from "@/lib/ui";
import { avisarError, avisarOk } from "@/components/ui/avisos";
import type { OpcionSelect, ViaticoFila } from "./tipos";

// La tabla de Expenses. Hermana de TablaRegistros: misma cáscara, misma
// selección, mismas acciones y mismo modo lectura, porque las dos son data
// tables. Lo que cambia son las columnas y qué se puede hacer en masa.
//
// En masa se edita y se elimina, igual que en Time Tracking. Los campos que se
// pueden cambiar son los que tienen sentido uniformes —cliente, concepto,
// moneda—; la fecha, el monto y el comprobante son propios de cada gasto.
const OPCIONES_CONCEPTO = Object.entries(ETIQUETA_CONCEPTO).map(
  ([value, label]) => ({ value, label }),
);
const OPCIONES_MONEDA = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

export function TablaViaticos({
  filas,
  proyectos,
  usuarios,
}: {
  filas: ViaticoFila[];
  proyectos: OpcionSelect[];
  usuarios: OpcionSelect[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();

  // Edición masiva: campo a cambiar y valor a aplicar.
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState<CampoMasivoViatico>("clienteId");
  const [valor, setValor] = useState("");

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

  const cambiarCampo = (c: CampoMasivoViatico) => {
    setCampo(c);
    setValor(
      c === "clienteId"
        ? (proyectos[0]?.id ?? "")
        : c === "concepto"
          ? OPCIONES_CONCEPTO[0].value
          : OPCIONES_MONEDA[0].value,
    );
  };

  const opcionesDelCampo =
    campo === "clienteId"
      ? proyectos.map((p) => ({ value: p.id, label: p.nombre }))
      : campo === "concepto"
        ? OPCIONES_CONCEPTO
        : OPCIONES_MONEDA;

  const aplicar = () =>
    start(async () => {
      const r = await editarViaticos([...sel], campo, valor);
      if (r.error) {
        avisarError(r.error);
        return;
      }
      limpiar();
      avisarOk(
        r.actualizados === 1
          ? "Viático actualizado"
          : `${r.actualizados} viáticos actualizados`,
      );
    });

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

          {editando && (
            <div className="flex w-full flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-dc-muted">Cambiar</span>
              <Dropdown
                value={campo}
                onChange={(v) => cambiarCampo(v as CampoMasivoViatico)}
                options={[
                  { value: "clienteId", label: "Cliente" },
                  { value: "concepto", label: "Concepto" },
                  { value: "moneda", label: "Moneda" },
                ]}
                className="w-40"
                ariaLabel="Campo a cambiar"
              />
              <span className="text-xs text-dc-muted">a</span>
              <Dropdown
                value={valor}
                onChange={setValor}
                options={opcionesDelCampo}
                className="w-52"
                ariaLabel="Valor a aplicar"
              />
              <button
                type="button"
                onClick={aplicar}
                disabled={pending || !valor}
                className={BTN_PRIMARY_SM}
              >
                {pending ? "Aplicando…" : "Aplicar"}
              </button>
            </div>
          )}
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
            usuarios={usuarios}
            seleccionado={sel.has(f.id)}
            onToggle={toggle}
          />
        ))}
      </TablaDatos>
    </div>
  );
}
