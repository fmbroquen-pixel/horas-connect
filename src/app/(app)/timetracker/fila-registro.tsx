"use client";

import { actualizarCampoRegistro, eliminarRegistro } from "./actions";
import { formatMonto, hoyISO, restarDiasISO } from "@/lib/formato";
import { DIAS_VENTANA_EDICION } from "./constantes";
import { GRID_TIMETRACKER } from "./grid";
import {
  CeldaFecha,
  CeldaHoras,
  CeldaOpciones,
  CeldaSoloLectura,
} from "@/components/tabla/celda-editable";
import type { OpcionCategoria, OpcionSelect, RegistroFila } from "./tipos";
import { BotonEliminarIcono } from "@/components/tabla/acciones-fila";

const OPCIONES_OWNERSHIP = [
  { value: "owner", label: "Owner" },
  { value: "backup", label: "Backup" },
];
const OPCIONES_MODALIDAD = [
  { value: "presencial", label: "Presencial" },
  { value: "virtual", label: "Virtual" },
];

function mostrarFecha(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Fila del historial con edición inline: cada celda se edita en el lugar y se
// guarda sola al salir del campo o con Enter. No hay modo edición de fila ni
// botón de guardar; la única acción explícita es eliminar.
export function FilaRegistro({
  registro,
  proyectos,
  categorias,
  seleccionado,
  onToggle,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  categorias: OpcionCategoria[];
  seleccionado: boolean;
  onToggle: (id: string) => void;
}) {
  const editable = registro.editable;

  const guardar = (campo: Parameters<typeof actualizarCampoRegistro>[1]) =>
    async (valor: string) => actualizarCampoRegistro(registro.id, campo, valor);

  return (
    <div className="border-b border-dc-line px-4 py-2 last:border-0">
      <div className={GRID_TIMETRACKER}>
        {editable ? (
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={() => onToggle(registro.id)}
            className="h-4 w-4 accent-dc-purple"
            aria-label="Seleccionar fila"
          />
        ) : (
          <span />
        )}

        <CeldaFecha
          valor={registro.fecha}
          onGuardar={guardar("fecha")}
          ariaLabel="Fecha"
          mostrar={mostrarFecha}
          max={hoyISO()}
          min={restarDiasISO(hoyISO(), DIAS_VENTANA_EDICION)}
          editable={editable}
        />

        <CeldaOpciones
          valor={registro.clienteId}
          opciones={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
          onGuardar={guardar("clienteId")}
          ariaLabel="Cliente"
          editable={editable}
        />

        <CeldaOpciones
          valor={registro.categoriaId}
          opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
          onGuardar={guardar("categoriaId")}
          ariaLabel="Tarea"
          // Registros anteriores al catálogo: sin categoría, pero con la
          // etiqueta de su clasificación previa para no perder el historial.
          etiqueta={registro.categoriaId ? undefined : registro.categoriaNombre}
          placeholder="Elegí una tarea"
          editable={editable}
        />

        <CeldaOpciones
          valor={registro.ownership}
          opciones={OPCIONES_OWNERSHIP}
          onGuardar={guardar("ownership")}
          ariaLabel="Ownership"
          editable={editable}
        />

        <CeldaHoras
          valor={registro.horas}
          onGuardar={guardar("horas")}
          ariaLabel="Horas"
          editable={editable}
        />

        <CeldaOpciones
          valor={registro.modalidad}
          opciones={OPCIONES_MODALIDAD}
          onGuardar={guardar("modalidad")}
          ariaLabel="Modalidad"
          editable={editable}
        />

        {/* Calculados a partir de la tarifa vigente: no se editan. */}
        <CeldaSoloLectura tenue>
          <span className="tabular-nums">{formatMonto(registro.tarifaUsd)}</span>
        </CeldaSoloLectura>
        <CeldaSoloLectura>
          <span className="tabular-nums">{formatMonto(registro.montoUsd)}</span>
        </CeldaSoloLectura>

        <span className="flex justify-center">
          {editable ? (
            <BotonEliminarIcono
              onConfirm={() => eliminarRegistro(registro.id)}
              label="Eliminar registro"
            />
          ) : (
            <span
              className="text-xs text-dc-muted"
              title={`Pasados ${DIAS_VENTANA_EDICION} días el registro queda fijo`}
            >
              Cerrado
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
