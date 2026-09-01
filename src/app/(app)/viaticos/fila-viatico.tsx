"use client";

import { useRef, useTransition } from "react";
import {
  actualizarCampoViatico,
  actualizarComprobante,
  eliminarViatico,
} from "./actions";
import { formatMonto, hoyISO } from "@/lib/formato";
import {
  GRID_VIATICOS,
  ETIQUETA_CONCEPTO,
  type OpcionSelect,
  type ViaticoFila,
} from "./tipos";
import {
  CeldaFecha,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/tabla/celda-editable";
import { BotonEditarIcono, BotonEliminarIcono } from "@/components/tabla/acciones-fila";
import { MarcaEdicion } from "@/components/tabla/marca-edicion";
import { CarrilAcciones } from "@/components/tabla/carril-acciones";
import { IconoSoloLectura } from "@/components/tabla/icono-solo-lectura";
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

// Fila del historial con edición inline, igual que Time Tracking: cada celda
// se edita en el lugar y se guarda sola al salir del campo o con Enter.
//
// Antes esta fila era texto plano y editar abría un formulario que reemplazaba
// la fila entera. Eso dejaba dos criterios distintos en la app para lo mismo:
// en Time Tracking los datos editables se anunciaban solos al pasar por
// encima, y acá no se distinguían de los que no lo son. Ahora las dos usan las
// mismas celdas, así que la señal de "esto se puede tocar" es la misma.
export function FilaViatico({
  viatico,
  proyectos,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
}) {
  const filaRef = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [subiendo, start] = useTransition();

  // Ver si, tocar no: el comprobante se sigue abriendo, pero no se reemplaza.
  const editable = viatico.clienteActivo;

  const guardar = (campo: Parameters<typeof actualizarCampoViatico>[1]) =>
    async (valor: string) => actualizarCampoViatico(viatico.id, campo, valor);

  // El lápiz entra a la primera celda editable, la misma acción que hacer clic
  // en ella. En una tabla que se edita celda por celda no hay ningún "modo
  // edición" que abrir; lo que aporta el botón es hacer visible que se puede.
  const editarPrimeraCelda = () => {
    const celda = filaRef.current?.querySelector<HTMLElement>("[data-celda-editable]");
    celda?.click();
  };

  const subirArchivo = (archivo: File) =>
    start(async () => {
      const fd = new FormData();
      fd.set("archivo", archivo);
      const r = await actualizarComprobante(viatico.id, fd);
      if (r.error) avisarError(r.error);
      if (archivoRef.current) archivoRef.current.value = "";
    });

  return (
    <div ref={filaRef} className="border-b border-dc-line px-3 py-2 last:border-0">
      <div className={GRID_VIATICOS}>
        <CeldaFecha
          valor={viatico.fecha}
          onGuardar={guardar("fecha")}
          ariaLabel="Fecha"
          mostrar={mostrarFecha}
          max={hoyISO()}
         editable={editable}
        />

        <CeldaOpciones
          valor={viatico.clienteId}
          opciones={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
          onGuardar={guardar("clienteId")}
          ariaLabel="Cliente"
         editable={editable}
        />

        <CeldaOpciones
          valor={viatico.concepto}
          opciones={OPCIONES_CONCEPTO}
          onGuardar={guardar("concepto")}
          ariaLabel="Concepto"
         editable={editable}
        />

        <CeldaOpciones
          valor={viatico.moneda}
          opciones={OPCIONES_MONEDA}
          onGuardar={guardar("moneda")}
          ariaLabel="Moneda"
         editable={editable}
        />

        <CeldaTexto
          valor={String(viatico.monto)}
          onGuardar={guardar("monto")}
          ariaLabel="Monto"
          // Se muestra formateado y se edita en crudo: con el separador de
          // miles puesto, el campo no se puede seguir escribiendo.
          mostrar={(v) => formatMonto(Number(v))}
         editable={editable}
        />

        {/* El comprobante no entra en una celda de texto: se ve con el clip y
            se reemplaza con el mismo gesto, eligiendo otro archivo. */}
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
          {editable && (
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
          {!editable && !viatico.archivoUrl && (
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

        <CarrilAcciones temporal={<MarcaEdicion detalle={viatico.edicion} />}>
          {editable ? (
            <>
              <BotonEditarIcono onClick={editarPrimeraCelda} />
              <BotonEliminarIcono
                onConfirm={() => eliminarViatico(viatico.id)}
                mensaje="Viático enviado a papelera"
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
