"use client";

import { useEffect, useRef, useState } from "react";
import {
  actualizarCampoTarea,
  actualizarRangoTarea,
  eliminarTarea,
  type ConflictoEnCurso,
} from "./actions";
import { CIERRES_EN_CURSO } from "@/lib/secuencia-tareas";
import { ETIQUETA_ESTADO as ETIQUETAS } from "./constantes";
import { Modal } from "@/components/ui/modal";
import { avisarError } from "@/components/ui/avisos";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import {
  GRID_ROADMAP,
  ETIQUETA_ESTADO,
  OPCIONES_ESTADO,
  type TareaRoadmapFila,
} from "./constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import {
  CeldaHoras,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/campos/celda-editable";
import { RangoFechas } from "./rango-fechas";
import { claseResaltado, useResaltado } from "./resaltado";
import { TagEstado } from "@/components/ui/tag-estado";
import { BotonEliminarIcono } from "@/components/ui/acciones-fila";
import { SelectorPersonas } from "./selector-personas";
import { useSoloLectura } from "./solo-lectura";

// El contenedor con scroll más cercano hacia arriba. El plan vive dentro del
// scroll del tablero, no del de la ventana.
function contenedorScrolleable(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const overflow = getComputedStyle(p).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && p.scrollHeight > p.clientHeight) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

// Centra la fila en su contenedor.
//
// Dos decisiones que parecen detalles y no lo son:
//
// A mano y no con scrollIntoView, porque la pantalla entra con una animación
// que aplica un `transform` a un ancestro y scrollIntoView, calculado en ese
// momento, no movía nada: quedaba en scrollTop 0 con la fila mil píxeles más
// abajo.
//
// Y salto instantáneo, no `behavior: "smooth"`: el scroll suave se anima
// cuadro a cuadro, y una pestaña en segundo plano no emite cuadros. Abrir el
// enlace en una pestaña nueva —que es exactamente lo que uno hace con una
// lista de pendientes— dejaba el scroll encolado sin avanzar nunca, y al
// volver a la pestaña el realce ya se había apagado. Además, al llegar desde
// otra pantalla no hay nada que seguir con la vista: se aterriza.
function centrarEnSuContenedor(fila: HTMLElement) {
  const cont = contenedorScrolleable(fila);
  if (!cont) {
    fila.scrollIntoView({ block: "center" });
    return;
  }
  const f = fila.getBoundingClientRect();
  const c = cont.getBoundingClientRect();
  cont.scrollTop += f.top - c.top - (c.height - f.height) / 2;
}

// Fila del plan con edición inline: cada celda se guarda sola al salir o con
// Enter. Inicio y Fin son la excepción: siguen siendo dos columnas, pero se
// editan desde un único calendario de rango y se guardan de una. Cualquier
// cambio de fechas recalcula, en el servidor, únicamente las tareas
// posteriores.
export function FilaTareaRoadmap({
  tarea,
  seleccionada,
  onToggle,
  agarre,
  esDestino = false,
  onReprogramadas,
}: {
  tarea: TareaRoadmapFila;
  seleccionada: boolean;
  onToggle: (id: string) => void;
  // Cuántas tareas quedaron reprogramadas al editar estas fechas. Sube hasta
  // el tablero, que es el que muestra el toast: hay uno solo para la pantalla.
  onReprogramadas?: (cantidad: number) => void;
  // Props de arrastre para la celda del checkbox. Las pone la lista, que es
  // la que conoce el orden completo de sus tareas.
  agarre?: {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  // Es la tarea a la que se llegó desde "Próximas dos semanas" del Home.
  esDestino?: boolean;
}) {
  // El calendario de rango se dibuja en un portal y tapa parte de la tabla:
  // con la fila marcada no se pierde de vista sobre qué tarea se está
  // operando. Solo puede haber una marcada a la vez porque solo puede haber
  // un calendario abierto: abrir otro cierra el anterior.
  const [editandoFechas, setEditandoFechas] = useState(false);
  const soloLectura = useSoloLectura();

  // Realce temporal cuando esta tarea acaba de ser reprogramada: fuerte si es
  // la que se movió, tenue si cambió por dependencia.
  const { resaltadoDe, marcarReprogramacion } = useResaltado();
  const resaltado = claseResaltado(resaltadoDe(tarea.id));

  // Llegada desde el Home: centrar la fila y encenderla un momento. El plan
  // puede tener 70 tareas dentro de un contenedor con scroll propio, así que
  // sin esto "llegar a la tarea" seguía siendo buscarla a mano.
  const filaRef = useRef<HTMLDivElement>(null);
  const [destacada, setDestacada] = useState(esDestino);
  useEffect(() => {
    if (!esDestino) return;
    // Un tick de espera: al montar, la animación de entrada de la pantalla
    // todavía está corriendo y el layout no está firme.
    const ir = setTimeout(() => {
      if (filaRef.current) centrarEnSuContenedor(filaRef.current);
    }, 60);
    // Un poco más que los 2,8s de la animación: si la clase se sacara antes,
    // el realce se cortaría a mitad del desvanecido.
    const apagar = setTimeout(() => setDestacada(false), 3000);
    return () => {
      clearTimeout(ir);
      clearTimeout(apagar);
    };
  }, [esDestino]);

  const guardar = (campo: Parameters<typeof actualizarCampoTarea>[1]) =>
    async (valor: string) => actualizarCampoTarea(tarea.id, campo, valor);

  // Poner una tarea En curso cuando ya hay otra no se rechaza: se pregunta.
  // El servidor devuelve cuál estorba y acá se ofrece con qué cerrarla, para
  // que las dos cosas se decidan juntas y se guarden en una sola operación.
  const [conflicto, setConflicto] = useState<ConflictoEnCurso | null>(null);
  const [cierre, setCierre] = useState<string>(CIERRES_EN_CURSO[0]);
  const [resolviendo, setResolviendo] = useState(false);

  const guardarEstado = async (valor: string) => {
    const r = await actualizarCampoTarea(tarea.id, "estado", valor);
    if (r.conflicto) {
      setCierre(CIERRES_EN_CURSO[0]);
      setConflicto(r.conflicto);
      // No es un error: la celda vuelve atrás y el popup explica.
      return { revertir: true };
    }
    return r;
  };

  const resolverConflicto = async () => {
    setResolviendo(true);
    const r = await actualizarCampoTarea(tarea.id, "estado", "en_curso", cierre);
    setResolviendo(false);
    setConflicto(null);
    if (r.error) avisarError(r.error);
  };

  // Editar las fechas a mano es una reprogramación igual que arrastrar la
  // tarea: corre la cadena de todo lo que viene después. Así que se avisa
  // igual —esta tarea con el realce fuerte por ser la causa, las arrastradas
  // por dependencia con el tenue— y con el mismo toast.
  const guardarRango = async (r: { inicio: string; fin: string }) => {
    const res = await actualizarRangoTarea(tarea.id, r.inicio, r.fin);
    if (res.error) return res;
    marcarReprogramacion([tarea.id], res.recalculadas);
    onReprogramadas?.(res.recalculadas.length);
    return res;
  };

  return (
    // El realce es fondo + una barra lateral por inset shadow. Ninguno de los
    // dos ocupa espacio: la fila no cambia de alto ni empuja a las de abajo
    // al abrir el calendario.
    // Sin transición de color: la selección tiene que prender y apagar en el
    // acto. Con los 150ms que había, destildar dejaba el violeta yéndose de a
    // poco y parecía que la fila seguía a medio seleccionar.
    <div
      ref={filaRef}
      data-fila-arrastrable
      className={`group/fila border-b border-dc-line px-4 py-2 last:border-0 ${
        seleccionada ? "dc-fila-seleccionada" : ""
      } ${destacada ? "dc-fila-destino" : ""} ${
        editandoFechas
          ? "bg-dc-peri/[0.07] shadow-[inset_3px_0_0_0_var(--color-dc-peri)]"
          : ""
      }`}
    >
      <div className={GRID_ROADMAP}>
        {/* La celda entera es la zona de agarre: acá no hay nada que editar,
            así que arrastrar desde la izquierda no compite con el nombre, las
            fechas ni los botones de la derecha. El checkbox sigue andando con
            un clic, porque el navegador no emite click si hubo arrastre.
            La agarradera es la señal de que se puede: antes solo lo decía un
            tooltip, que hay que descubrir pasando por encima. */}
        <span
          {...agarre}
          data-tooltip={agarre ? "Arrastrá para reordenar la tarea" : undefined}
          // Tres cosas para que el agarre sea agarrable, las tres medidas:
          // self-stretch, porque en una grilla con items-center la celda se
          // encoge al alto de su contenido y quedaba en una tira de 16px -el
          // alto del checkbox-; y el -my-2 con py-2, que la hace sangrar sobre
          // el padding vertical de la fila, que si no queda muerto.
          // De 34x16 a 56x36: cuatro veces el área.
          className={`-my-2 flex items-center gap-1.5 py-2 ${agarre ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          {agarre && (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
              className="shrink-0 text-dc-muted/50 transition-colors group-hover/fila:text-dc-muted"
            >
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          )}
          {!soloLectura && (
            <input
              type="checkbox"
              checked={seleccionada}
              onChange={() => onToggle(tarea.id)}
              className="h-4 w-4 accent-dc-purple"
              aria-label={`Seleccionar ${tarea.nombre}`}
            />
          )}
        </span>

        {/* Columna de texto largo: alineada a la izquierda, como el header.
            Las personas van pegadas al nombre porque califican a la tarea; no
            merecen una columna propia. */}
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1">
            <CeldaTexto
              valor={tarea.nombre}
              onGuardar={guardar("nombre")}
              ariaLabel="Nombre de la tarea"
              alinear="izquierda"
              editable={!soloLectura}
            />
          </span>
          {/* Marca de agrupada. Va junto al nombre y no en una columna propia:
              es una propiedad de la tarea, como las personas, y una columna
              vacía en el 95% de las filas costaría ancho para no decir nada. */}
          {tarea.grupoId && (
            <span
              data-tooltip="Tarea agrupada"
              aria-label="Tarea agrupada"
              className="inline-flex shrink-0 text-dc-peri"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7l9-4 9 4-9 4-9-4Z" />
                <path d="M3 12l9 4 9-4" />
                <path d="M3 17l9 4 9-4" />
              </svg>
            </span>
          )}
          <SelectorPersonas
            tareaId={tarea.id}
            personas={tarea.personas}
            soloLectura={soloLectura}
          />
        </span>

        <RangoFechas
          rango={{ inicio: tarea.fechaInicio, fin: tarea.fechaFin }}
          onGuardar={guardarRango}
          mostrar={mostrarFechaISO}
          onAbiertoChange={setEditandoFechas}
          resaltado={resaltado}
          editable={!soloLectura}
        />

        <CeldaHoras
          valor={tarea.horasEstimadas}
          onGuardar={guardar("horasEstimadas")}
          ariaLabel="Horas estimadas"
          editable={!soloLectura}
        />

        {/* El punto suelto se fue: la pastilla ya lo trae, y tenerlo afuera
            dejaba el color a un lado y la etiqueta al otro. Se sigue editando
            con el mismo dropdown; lo único que cambia es cómo se lee. */}
        <span className="min-w-0">
          <CeldaOpciones
            valor={tarea.estado}
            opciones={OPCIONES_ESTADO}
            onGuardar={guardarEstado}
            ariaLabel="Estado"
            etiqueta={ETIQUETA_ESTADO[tarea.estado]}
            renderLectura={(estado) => <TagEstado estado={estado} />}
            editable={!soloLectura}
          />
        </span>

        <span className="flex justify-center">
          {!soloLectura && (
            <BotonEliminarIcono
              onConfirm={() => eliminarTarea(tarea.id)}
              mensaje="Tarea enviada a papelera"
              label="Eliminar tarea"
            />
          )}
        </span>
      </div>

      {/* Las tareas de una lista son secuenciales: solo una puede estar En
          curso. En vez de rechazar el cambio, se pregunta con qué cerrar la
          anterior y las dos cosas se guardan juntas. Cancelar no toca nada:
          hasta acá no se escribió. */}
      <Modal
        open={conflicto !== null}
        onClose={() => setConflicto(null)}
        labelledBy="titulo-conflicto-en-curso"
      >
        <div className="w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-conflicto-en-curso"
            className="font-display text-sm uppercase text-white"
          >
            Ya hay una tarea en curso
          </h2>
          <p className="mt-3 text-sm text-dc-text">
            <strong className="text-white">{conflicto?.nombre}</strong> está En
            curso en esta lista. Para pasar{" "}
            <strong className="text-white">{tarea.nombre}</strong> a En curso,
            elegí con qué estado queda la anterior.
          </p>

          {/* Grilla de tres y no flex-wrap: con wrap quedaban dos arriba y una
              abajo, y una opción sola en un renglón se lee como distinta de las
              otras dos cuando son tres alternativas del mismo rango. */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CIERRES_EN_CURSO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCierre(c)}
                aria-pressed={cierre === c}
                className={`flex justify-center rounded-xl border px-2 py-2 transition ${
                  cierre === c
                    ? "border-dc-peri bg-dc-peri/15 text-dc-text"
                    : "border-dc-line text-dc-muted hover:border-dc-peri/60 hover:text-dc-text"
                }`}
              >
                <TagEstado estado={c} />
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConflicto(null)}
              className={BTN_SECONDARY}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void resolverConflicto()}
              disabled={resolviendo}
              className={BTN_PRIMARY}
            >
              {resolviendo
                ? "Guardando…"
                : `Marcar anterior como ${ETIQUETAS[cierre]}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
