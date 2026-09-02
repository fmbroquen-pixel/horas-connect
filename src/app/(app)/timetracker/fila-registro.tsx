"use client";

import { useRef, useState } from "react";
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
import { Modal } from "@/components/ui/modal";
import { avisarError } from "@/components/ui/avisos";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import type { PreguntaAsignacion } from "./actions";
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
  usuarios,
  seleccionado,
  onToggle,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  conceptos: OpcionConcepto[];
  usuarios: OpcionSelect[];
  seleccionado: boolean;
  onToggle: (id: string) => void;
}) {
  const filaRef = useRef<HTMLDivElement>(null);

  // Reasignar cuando el nuevo dueño no tiene el proyecto: el servidor devuelve
  // la pregunta en vez de rechazar, y acá se ofrece resolverla en el momento.
  // Rechazar sin más obligaba a salir de Time Tracking, ir a Settings, asignar
  // y volver a buscar la fila.
  const [pregunta, setPregunta] = useState<{
    datos: PreguntaAsignacion;
    usuarioId: string;
  } | null>(null);
  const [asignando, setAsignando] = useState(false);

  // La historia se mira cuando el cliente está inactivo O cuando el dueño de
  // las horas está bloqueado. El servidor ya rechaza las dos; acá se deja de
  // ofrecer, que es lo que evita el intento inútil: una celda que invita a
  // escribir y después avisa que no se podía es peor que una que no invita.
  //
  // El motivo se distingue porque se arreglan en lugares distintos: uno se
  // reactiva en Clientes y el otro en Usuarios.
  const editable = registro.clienteActivo && registro.usuarioActivo;
  const motivo = !registro.clienteActivo
    ? MOTIVO_INACTIVO
    : `${registro.usuarioNombre} está bloqueado · Solo lectura`;

  const guardar = (campo: Parameters<typeof actualizarCampoRegistro>[1]) =>
    async (valor: string) => actualizarCampoRegistro(registro.id, campo, valor);

  // El dueño va aparte: su respuesta puede ser una pregunta, no un error.
  const guardarUsuario = async (valor: string) => {
    const r = await actualizarCampoRegistro(registro.id, "usuarioId", valor);
    if (r.asignacion) {
      setPregunta({ datos: r.asignacion, usuarioId: valor });
      // No es un error: la celda vuelve a lo que estaba y el popup explica.
      return { revertir: true };
    }
    return r;
  };

  const confirmarAsignacion = async () => {
    if (!pregunta) return;
    setAsignando(true);
    const r = await actualizarCampoRegistro(
      registro.id,
      "usuarioId",
      pregunta.usuarioId,
      true,
    );
    setAsignando(false);
    setPregunta(null);
    if (r.error) avisarError(r.error);
  };

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
          data-tooltip={editable ? undefined : motivo}
        />

        {/* Cambiar el dueño revalúa el registro con la tarifa de esa persona
            en la fecha del registro: no es mover una etiqueta. Por eso lo hace
            solo un admin, y por eso el servidor puede frenar y preguntar. */}
        <CeldaOpciones
          valor={registro.usuarioId}
          opciones={usuarios.map((u) => ({ value: u.id, label: u.nombre }))}
          onGuardar={guardarUsuario}
          ariaLabel="Usuario dueño de las horas"
          etiqueta={registro.usuarioNombre}
          alinear="izquierda"
          editable={editable && usuarios.length > 1}
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
            <IconoSoloLectura motivo={motivo} />
          )}
        </CarrilAcciones>
      </div>

      {/* El proyecto no es de quien va a quedar como dueño. No se rechaza: se
          ofrece asignárselo como Backup, que es el rol que no desplaza a nadie
          -el Owner es uno solo y ya tiene dueño-. Cancelar no toca nada: hasta
          acá no se escribió. */}
      <Modal
        open={pregunta !== null}
        onClose={() => setPregunta(null)}
        labelledBy="titulo-asignar-proyecto"
      >
        <div className="w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-asignar-proyecto"
            className="font-display text-sm uppercase text-white"
          >
            Proyecto no asignado
          </h2>
          <p className="mt-3 text-sm text-dc-text">
            <strong className="text-white">{pregunta?.datos.usuarioNombre}</strong> no
            tiene asignado{" "}
            <strong className="text-white">{pregunta?.datos.clienteNombre}</strong>.
            ¿Asignarlo como Backup?
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setPregunta(null)}
              className={BTN_SECONDARY}
            >
              No
            </button>
            <button
              type="button"
              onClick={confirmarAsignacion}
              disabled={asignando}
              className={BTN_PRIMARY}
            >
              {asignando ? "Asignando…" : "Sí, asignar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
