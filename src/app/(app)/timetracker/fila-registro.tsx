"use client";

import { useRef, useState } from "react";
import { actualizarCampoRegistro, eliminarRegistro } from "./actions";
import { formatMonto, hoyISO } from "@/lib/formato";
import { COLUMNAS_TIMETRACKER, type ColumnaId } from "./columnas";
import { FilaDatos } from "@/components/data-table/tabla-datos";
import {
  CeldaFecha,
  CeldaHoras,
  CeldaOpciones,
  CeldaSoloLectura,
} from "@/components/campos/celda-editable";
import type { OpcionConcepto, OpcionSelect, RegistroFila } from "./tipos";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonListoIcono,
} from "@/components/ui/acciones-fila";
import { MarcaEdicion } from "@/components/data-table/marca-edicion";
import { CarrilAcciones } from "@/components/data-table/carril-acciones";
import { Modal } from "@/components/ui/modal";
import { avisarError } from "@/components/ui/avisos";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import type { PreguntaAsignacion } from "./actions";
import { IconoSoloLectura } from "@/components/data-table/icono-solo-lectura";
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

  // La tabla es de lectura. Se entra a editar con el lápiz y se sale con el
  // tilde; hasta entonces ninguna celda responde al clic.
  //
  // Antes cada celda se editaba sola al tocarla, y eso convertía cualquier
  // clic —para leer un nombre recortado, para seleccionar una fila, para
  // copiar un monto— en el principio de una edición. En una tabla que se mira
  // mucho más de lo que se corrige, el gesto barato tiene que ser mirar.
  const [editando, setEditando] = useState(false);

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

  // Abrir la fila y entrar directo a la primera celda: si hubo que pedir la
  // edición explícitamente, lo que sigue es escribir.
  const abrirEdicion = () => {
    setEditando(true);
    setTimeout(() => {
      filaRef.current?.querySelector<HTMLElement>("[data-celda-editable]")?.click();
    }, 0);
  };

  // Las celdas responden al clic solo con la fila abierta. Se combina con los
  // dos motivos que congelan un registro: cliente inactivo y usuario bloqueado.
  const celdaEditable = editable && editando;

  // Una celda por columna, indexadas por id. El orden lo pone COLUMNAS al
  // recorrerlas: es lo que hace imposible repetir el cruce de Fecha y Usuario.
  const celdas: Record<ColumnaId, React.ReactNode> = {
    seleccion: (
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={() => onToggle(registro.id)}
          disabled={!editable}
          className="h-4 w-4 accent-dc-purple disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Seleccionar fila"
          data-tooltip={editable ? undefined : motivo}
        />
    ),

    fecha: (
      <CeldaFecha
        valor={registro.fecha}
        onGuardar={guardar("fecha")}
        ariaLabel="Fecha"
        mostrar={mostrarFecha}
        max={hoyISO()}
        editable={celdaEditable}
      />
    ),

    // Cambiar el dueño revalúa el registro con la tarifa de esa persona en la
    // fecha del registro: no es mover una etiqueta. Por eso lo hace solo un
    // admin, y por eso el servidor puede frenar y preguntar.
    usuario: (
      <CeldaOpciones
        valor={registro.usuarioId}
        opciones={usuarios.map((u) => ({ value: u.id, label: u.nombre }))}
        onGuardar={guardarUsuario}
        ariaLabel="Usuario dueño de las horas"
        etiqueta={registro.usuarioNombre}
        alinear="izquierda"
        editable={celdaEditable && usuarios.length > 1}
      />
    ),

    cliente: (
      <CeldaOpciones
        valor={registro.clienteId}
        opciones={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
        onGuardar={guardar("clienteId")}
        ariaLabel="Cliente"
        alinear="izquierda"
        editable={celdaEditable}
      />
    ),

    concepto: (
      <CeldaOpciones
        valor={registro.conceptoId}
        opciones={conceptos.map((c) => ({ value: c.id, label: c.nombre }))}
        onGuardar={guardar("conceptoId")}
        ariaLabel="Concepto"
        alinear="izquierda"
        // Cubre dos casos: registros anteriores al catálogo (sin concepto) y
        // conceptos dados de baja, que ya no están entre las opciones pero
        // siguen etiquetando su historial.
        etiqueta={registro.conceptoNombre}
        placeholder="Elegí un concepto"
        editable={celdaEditable}
      />
    ),

    ownership: (
      <CeldaOpciones
        valor={registro.ownership}
        opciones={OPCIONES_OWNERSHIP}
        onGuardar={guardar("ownership")}
        ariaLabel="Ownership"
        editable={celdaEditable}
      />
    ),

    horas: (
      <CeldaHoras
        valor={registro.horas}
        onGuardar={guardar("horas")}
        ariaLabel="Horas"
        editable={celdaEditable}
      />
    ),

    modalidad: (
      <CeldaOpciones
        valor={registro.modalidad}
        opciones={OPCIONES_MODALIDAD}
        onGuardar={guardar("modalidad")}
        ariaLabel="Modalidad"
        editable={celdaEditable}
      />
    ),

    // Calculados a partir de la tarifa vigente: no se editan nunca, ni con la
    // fila abierta.
    usdHora: (
      <CeldaSoloLectura tenue>
        <span className="tabular-nums">{formatMonto(registro.tarifaUsd)}</span>
      </CeldaSoloLectura>
    ),
    usdTotal: (
      <CeldaSoloLectura>
        <span className="tabular-nums">{formatMonto(registro.montoUsd)}</span>
      </CeldaSoloLectura>
    ),

    // Editar → Eliminar, el mismo par y el mismo orden que Expenses. Con la
    // fila abierta el lápiz se vuelve un tilde: es el mismo lugar, y lo que
    // cambia es si la fila responde o no.
    acciones: (
      <CarrilAcciones temporal={<MarcaEdicion detalle={registro.edicion} />}>
        {editable ? (
          <>
            {editando ? (
              <BotonListoIcono onClick={() => setEditando(false)} />
            ) : (
              <BotonEditarIcono onClick={abrirEdicion} />
            )}
            <BotonEliminarIcono
              onConfirm={() => eliminarRegistro(registro.id)}
              mensaje="Hora enviada a papelera"
            />
          </>
        ) : (
          <IconoSoloLectura motivo={motivo} />
        )}
      </CarrilAcciones>
    ),
  };

  return (
    <>
      <FilaDatos
        contenedorRef={filaRef}
        columnas={COLUMNAS_TIMETRACKER}
        celdas={celdas}
        className={
          editando
            ? "bg-dc-peri/[0.06] shadow-[inset_3px_0_0_0_var(--color-dc-peri)]"
            : ""
        }
      />

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
    </>
  );
}
