"use client";

import { useRef } from "react";
import { actualizarCampoRegistro, eliminarRegistro } from "./actions";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import {
  CeldaFecha,
  CeldaHoras,
  CeldaOpciones,
  CeldaSoloLectura,
} from "@/components/tabla/celda-editable";
import type { OpcionConcepto, OpcionSelect, RegistroFila } from "./tipos";
import { BotonEditarIcono, BotonEliminarIcono } from "@/components/tabla/acciones-fila";
import { MarcaEdicion } from "@/components/tabla/marca-edicion";
import { CarrilAcciones } from "@/components/tabla/carril-acciones";
import { IconoSoloLectura } from "@/components/tabla/icono-solo-lectura";
// El mismo texto que en Home CORE y en la vista del proyecto: la celda, el
// checkbox y el candado de esta fila dicen lo mismo que el semáforo de allá
// porque es la misma condición, no tres bloqueos distintos.
import { MOTIVO_INACTIVO } from "@/lib/inactivo";

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
// botón de guardar.
export function FilaRegistro({
  registro,
  proyectos,
  conceptos,
  seleccionado,
  onToggle,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  conceptos: OpcionConcepto[];
  seleccionado: boolean;
  onToggle: (id: string) => void;
}) {
  const filaRef = useRef<HTMLDivElement>(null);

  // La historia de un cliente inactivo se mira. El servidor ya lo rechaza; acá
  // se deja de ofrecer, que es lo que evita el intento inutil: una celda que
  // invita a escribir y despues avisa que no se podia es peor que una que no
  // invita.
  const editable = registro.clienteActivo;

  const guardar = (campo: Parameters<typeof actualizarCampoRegistro>[1]) =>
    async (valor: string) => actualizarCampoRegistro(registro.id, campo, valor);

  // El lápiz no abre un modo de edición —acá no existe— sino que entra a la
  // primera celda editable de la fila. Es la misma acción que hacer clic en
  // ella, con la ventaja de que se ve: la edición inline no se anuncia sola.
  const editarPrimeraCelda = () => {
    const celda = filaRef.current?.querySelector<HTMLElement>("[data-celda-editable]");
    celda?.click();
  };

  return (
    <div ref={filaRef} className="border-b border-dc-line px-4 py-2 last:border-0">
      <div className={GRID_TIMETRACKER}>
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={() => onToggle(registro.id)}
          disabled={!editable}
          className="h-4 w-4 accent-dc-purple disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Seleccionar fila"
          data-tooltip={editable ? undefined : MOTIVO_INACTIVO}
        />

        <CeldaFecha
          valor={registro.fecha}
          onGuardar={guardar("fecha")}
          ariaLabel="Fecha"
          mostrar={mostrarFecha}
          max={hoyISO()}
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
          valor={registro.conceptoId}
          opciones={conceptos.map((c) => ({ value: c.id, label: c.nombre }))}
          onGuardar={guardar("conceptoId")}
          ariaLabel="Concepto"
          // Cubre dos casos: registros anteriores al catálogo (sin concepto) y
          // conceptos dados de baja, que ya no están entre las opciones pero
          // siguen etiquetando su historial.
          etiqueta={registro.conceptoNombre}
          placeholder="Elegí un concepto"
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

        {/* Editar → Eliminar, el mismo par y el mismo orden que Expenses. */}
        <CarrilAcciones temporal={<MarcaEdicion detalle={registro.edicion} />}>
          {editable ? (
            <>
              <BotonEditarIcono onClick={editarPrimeraCelda} />
              <BotonEliminarIcono
                onConfirm={() => eliminarRegistro(registro.id)}
                mensaje="Hora enviada a papelera"
              />
            </>
          ) : (
            <IconoSoloLectura motivo={MOTIVO_INACTIVO} />
          )}
        </CarrilAcciones>
      </div>
    </div>
  );
}
