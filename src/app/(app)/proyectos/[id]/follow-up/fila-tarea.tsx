"use client";

import { useEffect, useRef, useState } from "react";
import { actualizarCampoTarea, actualizarRangoTarea, eliminarTarea } from "./actions";
import {
  GRID_ROADMAP,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  OPCIONES_ESTADO,
  type TareaRoadmapFila,
} from "./constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import {
  CeldaHoras,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/tabla/celda-editable";
import { RangoFechas } from "@/components/tabla/rango-fechas";
import { claseResaltado, useResaltado } from "./resaltado";
import { BotonEliminarIcono } from "@/components/tabla/acciones-fila";
import { SelectorPersonas } from "./selector-personas";

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
      className={`border-b border-dc-line px-4 py-2 last:border-0 ${
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
            un clic, porque el navegador no emite click si hubo arrastre. */}
        <span
          {...agarre}
          title={agarre ? "Arrastrá para reordenar la tarea" : undefined}
          className={`flex items-center ${agarre ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={() => onToggle(tarea.id)}
            className="h-4 w-4 accent-dc-purple"
            aria-label={`Seleccionar ${tarea.nombre}`}
          />
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
            />
          </span>
          <SelectorPersonas tareaId={tarea.id} personas={tarea.personas} />
        </span>

        <RangoFechas
          rango={{ inicio: tarea.fechaInicio, fin: tarea.fechaFin }}
          onGuardar={guardarRango}
          mostrar={mostrarFechaISO}
          onAbiertoChange={setEditandoFechas}
          resaltado={resaltado}
        />

        <CeldaHoras
          valor={tarea.horasEstimadas}
          onGuardar={guardar("horasEstimadas")}
          ariaLabel="Horas estimadas"
        />

        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="ml-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: COLOR_ESTADO[tarea.estado] }}
          />
          <span className="min-w-0 flex-1">
            <CeldaOpciones
              valor={tarea.estado}
              opciones={OPCIONES_ESTADO}
              onGuardar={guardar("estado")}
              ariaLabel="Estado"
              etiqueta={ETIQUETA_ESTADO[tarea.estado]}
            />
          </span>
        </span>

        <span className="flex justify-center">
          <BotonEliminarIcono
            onConfirm={() => eliminarTarea(tarea.id)}
            mensaje="Tarea enviada a papelera"
            label="Eliminar tarea"
          />
        </span>
      </div>
    </div>
  );
}
