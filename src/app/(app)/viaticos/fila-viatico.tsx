"use client";

import { useRef, useState, useTransition } from "react";
import {
  actualizarCampoViatico,
  actualizarComprobante,
  eliminarViatico,
} from "./actions";
import { formatMonto, hoyISO } from "@/lib/formato";
import { ETIQUETA_CONCEPTO, type OpcionSelect, type ViaticoFila } from "./tipos";
import { COLUMNAS_VIATICOS, type ColumnaId } from "./columnas";
import { FilaDatos } from "@/components/data-table/tabla-datos";
import {
  CeldaFecha,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/campos/celda-editable";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonListoIcono,
} from "@/components/ui/acciones-fila";
import { MarcaEdicion } from "@/components/data-table/marca-edicion";
import { CarrilAcciones } from "@/components/data-table/carril-acciones";
import { IconoSoloLectura } from "@/components/data-table/icono-solo-lectura";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";
import { avisarError } from "@/components/ui/avisos";

const OPCIONES_CONCEPTO = Object.entries(ETIQUETA_CONCEPTO).map(
  ([value, label]) => ({ value, label }),
);
const OPCIONES_MONEDA = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

function mostrarFecha(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Fila del historial, con el mismo patrón que Time Tracking: la tabla se mira,
// se entra a editar con el lápiz y se sale con el tilde.
//
// Las dos son data tables y comparten cáscara, celdas, acciones y modo lectura
// a propósito. Follow Up no: ahí las filas son pasos de un plan con secuencia y
// dependencias, no registros intercambiables, y no usa nada de data-table.
export function FilaViatico({
  viatico,
  proyectos,
  seleccionado,
  onToggle,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
  seleccionado: boolean;
  onToggle: (id: string) => void;
}) {
  const filaRef = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [subiendo, start] = useTransition();

  // La tabla es de lectura. Mismo criterio que Time Tracking: en una tabla que
  // se mira mucho más de lo que se corrige, el gesto barato tiene que ser mirar.
  const [editando, setEditando] = useState(false);

  // Ver sí, tocar no: el comprobante se sigue abriendo, pero no se reemplaza.
  const editable = viatico.clienteActivo;
  const celdaEditable = editable && editando;

  const guardar = (campo: Parameters<typeof actualizarCampoViatico>[1]) =>
    async (valor: string) => actualizarCampoViatico(viatico.id, campo, valor);

  const abrirEdicion = () => {
    setEditando(true);
    setTimeout(() => {
      filaRef.current?.querySelector<HTMLElement>("[data-celda-editable]")?.click();
    }, 0);
  };

  const subirArchivo = (archivo: File) =>
    start(async () => {
      const fd = new FormData();
      fd.set("archivo", archivo);
      const r = await actualizarComprobante(viatico.id, fd);
      if (r.error) avisarError(r.error);
      if (archivoRef.current) archivoRef.current.value = "";
    });

  // Una celda por columna, indexadas por id. El orden lo pone COLUMNAS al
  // recorrerlas: poner una celda en la columna equivocada dejó de ser posible.
  const celdas: Record<ColumnaId, React.ReactNode> = {
    seleccion: (
      <input
        type="checkbox"
        checked={seleccionado}
        onChange={() => onToggle(viatico.id)}
        disabled={!editable}
        className="h-4 w-4 accent-dc-purple disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Seleccionar fila"
        data-tooltip={editable ? undefined : MOTIVO_INACTIVO}
      />
    ),

    fecha: (
      <CeldaFecha
        valor={viatico.fecha}
        onGuardar={guardar("fecha")}
        ariaLabel="Fecha"
        mostrar={mostrarFecha}
        max={hoyISO()}
        editable={celdaEditable}
      />
    ),

    cliente: (
      <CeldaOpciones
        valor={viatico.clienteId}
        opciones={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
        onGuardar={guardar("clienteId")}
        ariaLabel="Cliente"
        alinear="izquierda"
        editable={celdaEditable}
      />
    ),

    concepto: (
      <CeldaOpciones
        valor={viatico.concepto}
        opciones={OPCIONES_CONCEPTO}
        onGuardar={guardar("concepto")}
        ariaLabel="Concepto"
        alinear="izquierda"
        editable={celdaEditable}
      />
    ),

    moneda: (
      <CeldaOpciones
        valor={viatico.moneda}
        opciones={OPCIONES_MONEDA}
        onGuardar={guardar("moneda")}
        ariaLabel="Moneda"
        editable={celdaEditable}
      />
    ),

    monto: (
      <CeldaTexto
        valor={String(viatico.monto)}
        onGuardar={guardar("monto")}
        ariaLabel="Monto"
        // Se muestra formateado y se edita en crudo: con el separador de
        // miles puesto, el campo no se puede seguir escribiendo.
        mostrar={(v) => formatMonto(Number(v))}
        editable={celdaEditable}
      />
    ),

    // El comprobante no entra en una celda de texto: se ve con el clip y se
    // reemplaza con el mismo gesto, eligiendo otro archivo.
    comprobante: (
      <span className="flex items-center justify-center gap-1">
        {viatico.archivoUrl && (
          <a
            href={viatico.archivoUrl}
            target="_blank"
            rel="noreferrer"
            data-tooltip="Ver comprobante"
            aria-label="Ver comprobante"
            className="inline-flex text-dc-peri transition hover:text-dc-pink"
          >
            <IconoClip />
          </a>
        )}
        {celdaEditable && (
          <button
            type="button"
            onClick={() => archivoRef.current?.click()}
            disabled={subiendo}
            data-tooltip={viatico.archivoUrl ? "Reemplazar comprobante" : "Adjuntar comprobante"}
            aria-label={viatico.archivoUrl ? "Reemplazar comprobante" : "Adjuntar comprobante"}
            className="inline-flex rounded-md p-1 text-dc-muted transition hover:bg-dc-peri/10 hover:text-dc-text disabled:opacity-50"
          >
            {viatico.archivoUrl ? <IconoReemplazar /> : <IconoAdjuntar />}
          </button>
        )}
        {/* Sin comprobante y sin poder adjuntarlo no queda nada que mostrar:
            un guion evita que la columna se lea como un dato faltante. */}
        {!celdaEditable && !viatico.archivoUrl && (
          <span className="text-dc-muted/60">—</span>
        )}
        <input
          ref={archivoRef}
          type="file"
          accept="image/*,.pdf"
          hidden
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subirArchivo(f);
          }}
        />
      </span>
    ),

    acciones: (
      <CarrilAcciones temporal={<MarcaEdicion detalle={viatico.edicion} />}>
        {editable ? (
          <>
            {editando ? (
              <BotonListoIcono onClick={() => setEditando(false)} />
            ) : (
              <BotonEditarIcono onClick={abrirEdicion} />
            )}
            <BotonEliminarIcono
              onConfirm={() => eliminarViatico(viatico.id)}
              mensaje="Viático enviado a papelera"
            />
          </>
        ) : (
          <IconoSoloLectura motivo={MOTIVO_INACTIVO} />
        )}
      </CarrilAcciones>
    ),
  };

  return (
    <FilaDatos
      contenedorRef={filaRef}
      columnas={COLUMNAS_VIATICOS}
      celdas={celdas}
      className={
        editando
          ? "bg-dc-peri/[0.06] shadow-[inset_3px_0_0_0_var(--color-dc-peri)]"
          : ""
      }
    />
  );
}

function IconoClip() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconoAdjuntar() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconoReemplazar() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    </svg>
  );
}
