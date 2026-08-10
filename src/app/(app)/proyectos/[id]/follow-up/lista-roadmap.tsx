"use client";

import { useId, useRef, useState, useTransition } from "react";
import { duplicarLista, eliminarLista, renombrarLista, reordenarTareas } from "./actions";
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  GRID_ROADMAP,
  progresoLista,
  type ListaRoadmapVista,
} from "./constantes";
import { FilaTareaRoadmap } from "./fila-tarea";
import { NuevaTareaBoton } from "./nueva-tarea-boton";
import { BTN_ICON_SM } from "@/lib/ui";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
} from "@/components/tabla/acciones-fila";
import { useReordenable } from "@/components/tabla/reordenable";
import { useResaltado } from "./resaltado";

// Una lista del plan sobre la superficie clara del Design System (.dc-panel),
// igual que las tablas de Time Tracking o Equipo: de ahí salen el encabezado
// centrado y las filas blancas. Arranca plegada: un roadmap largo se recorre
// primero por sus listas y se abre la que interesa.
export function ListaRoadmapCard({
  lista,
  sel,
  onToggle,
  onToggleLista,
  agarre,
  arrastrandoAlgo = false,
  onReprogramadas,
  abrirPorDefecto = false,
  tareaDestino,
}: {
  lista: ListaRoadmapVista;
  sel: Set<string>;
  onToggle: (id: string) => void;
  onToggleLista: (ids: string[], marcar: boolean) => void;
  // Props de arrastre para el header: la lista se mueve desde acá. Las pone
  // el tablero, que es el que conoce el orden completo.
  agarre?: {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  // Con una lista en el aire, el header no debe plegarse por un clic
  // accidental al soltar.
  arrastrandoAlgo?: boolean;
  // Avisa cuántas tareas se reprogramaron, para que el tablero muestre el
  // toast: es uno solo para toda la pantalla.
  onReprogramadas?: (cantidad: number) => void;
  // Se llegó a esta lista desde el Home: arranca desplegada, o la tarea
  // buscada quedaría escondida detrás del plegado.
  abrirPorDefecto?: boolean;
  tareaDestino?: string;
}) {
  // Plegadas por defecto: un roadmap largo se recorre primero por sus listas.
  // Salvo que se haya llegado acá buscando una tarea puntual.
  const [abierta, setAbierta] = useState(abrirPorDefecto);
  const [renombrando, setRenombrando] = useState(false);
  const idContenido = useId();

  // Avance y estado se derivan de las tareas en cada render: cualquier cambio
  // (editar un estado, agregar o borrar una tarea) los actualiza solo.
  const avance = progresoLista(lista.tareas);

  const ids = lista.tareas.map((t) => t.id);
  const seleccionadas = ids.filter((id) => sel.has(id)).length;
  const todasSel = ids.length > 0 && seleccionadas === ids.length;

  // Reordenar tareas dentro de esta lista. El agarre es la celda del
  // checkbox: la columna de la izquierda no tiene nada que editar, así que
  // arrastrar desde ahí no compite con el nombre, las fechas ni los botones.
  const [, startReorden] = useTransition();
  const { marcarReprogramacion } = useResaltado();
  const dnd = useReordenable(ids, (orden, movidaId) =>
    startReorden(async () => {
      const r = await reordenarTareas(lista.id, orden);
      marcarReprogramacion([movidaId], r.recalculadas);
      onReprogramadas?.(r.recalculadas.length);
    }),
  );
  // Igual que las listas: se dibuja según el orden del hook para que la fila
  // se mueva en el acto y no cuando vuelva el servidor.
  const tareaPorId = new Map(lista.tareas.map((t) => [t.id, t]));
  const tareasEnPantalla = dnd.orden
    .map((id) => tareaPorId.get(id))
    .filter(Boolean) as typeof lista.tareas;

  return (
    <section className="dc-panel overflow-hidden">
      {/* Todo el header pliega y despliega. Los controles que hacen otra cosa
          (renombrar, duplicar, eliminar) frenan la propagación para no
          arrastrar el desplegable con ellos. */}
      <header
        {...agarre}
        onClick={() => {
          // Al terminar un arrastre real el navegador no emite click, pero si
          // el gesto se cancela sí: no plegar mientras haya algo en el aire.
          if (!arrastrandoAlgo) setAbierta((v) => !v);
        }}
        title={agarre ? "Arrastrá para reordenar la lista" : undefined}
        className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-dc-line px-4 py-3 transition hover:bg-dc-card/60"
      >
        {renombrando ? (
          <span onClick={(e) => e.stopPropagation()}>
            <FormNombre lista={lista} onCerrar={() => setRenombrando(false)} />
          </span>
        ) : (
          <>
            {/* Sin onClick propio: el click (y Enter/Espacio, que en un
                <button> emiten click) burbujea al header y pliega una sola
                vez. Queda accesible por teclado y anuncia su estado. */}
            <button
              type="button"
              aria-expanded={abierta}
              aria-controls={idContenido}
              className="flex items-center gap-2 rounded-lg text-left transition hover:text-dc-peri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-150 ${abierta ? "" : "-rotate-90"}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <h3 className="font-display text-sm uppercase leading-none text-dc-text">
                {lista.nombre}
              </h3>
            </button>
            {/* Cantidad de tareas: número + ícono, sin la palabra. */}
            <span
              className="flex items-center gap-1 text-xs leading-none text-dc-muted"
              title="Cantidad de tareas"
            >
              {lista.tareas.length}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6h11M9 12h11M9 18h11" />
                <path d="M3.5 6L5 7.5 7.5 5" />
                <path d="M3.5 12L5 13.5 7.5 11" />
                <path d="M3.5 18L5 19.5 7.5 17" />
              </svg>
              <span className="sr-only">tareas</span>
              {seleccionadas > 0 && (
                <span className="ml-1">· {seleccionadas} seleccionada(s)</span>
              )}
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <BotonEditarIcono
                onClick={() => setRenombrando(true)}
                label="Renombrar lista"
              />
            </span>
          </>
        )}

        {/* Estado + avance: todo sobre la misma línea óptica (items-center y
            leading-none), para que el punto, el texto, la barra y el
            porcentaje no queden escalonados. */}
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs leading-none text-dc-muted">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_ESTADO[avance.estado] }}
            />
            {ETIQUETA_ESTADO[avance.estado]}
          </span>

          <span
            className="flex items-center gap-2"
            title={`${avance.cerradas} de ${avance.total} tarea(s) cerradas (finalizadas o no ejecutadas)`}
          >
            <span
              role="progressbar"
              aria-valuenow={avance.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Avance de ${lista.nombre}`}
              className="block h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-dc-line sm:w-32"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${avance.porcentaje}%`,
                  backgroundColor: COLOR_ESTADO[avance.estado],
                }}
              />
            </span>
            <span className="w-9 text-right text-xs leading-none tabular-nums text-dc-muted">
              {avance.porcentaje}%
            </span>
          </span>
        </span>

        <span
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <BotonIcono
            label="Duplicar lista"
            onClick={() => duplicarLista(lista.id)}
            path="M9 9h10v10H9zM5 15V5h10"
          />
          <BotonEliminarIcono
            onConfirm={() => eliminarLista(lista.id)}
            label="Eliminar lista"
          />
        </span>
      </header>

      {abierta && (
        // Sin overflow propio: el ancho mínimo de la grilla lo garantiza el
        // contenedor de listas, que es el único que scrollea. Una barra
        // horizontal por lista, además de duplicarse, desalineaba las
        // columnas entre listas al mover solo una.
        <div id={idContenido}>
          <div className={`dc-thead ${GRID_ROADMAP} border-b border-dc-line px-4`}>
            <input
              type="checkbox"
              checked={todasSel}
              onChange={() => onToggleLista(ids, !todasSel)}
              disabled={ids.length === 0}
              className="h-4 w-4 accent-dc-purple"
              aria-label={`Seleccionar todas las tareas de ${lista.nombre}`}
            />
            <span className="dc-col-izq">Tarea</span>
            <span>Inicio</span>
            <span>Fin</span>
            <span>Horas est.</span>
            <span>Estado</span>
            <span />
          </div>

          {tareasEnPantalla.map((t) => (
            <div key={t.id} {...dnd.zona(t.id)} className="relative">
              {/* Línea de destino: marca dónde va a caer la tarea que se
                  arrastra. Absoluta, así no empuja la fila ni cambia altos. */}
              {dnd.marcaAntes(t.id) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-0.5 rounded-full bg-dc-peri shadow-[0_0_8px_var(--color-dc-peri)]"
                />
              )}
              {/* Solo en la última tarea: es lo que permite soltar al final
                  de la lista. */}
              {dnd.marcaDespues(t.id) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-0.5 rounded-full bg-dc-peri shadow-[0_0_8px_var(--color-dc-peri)]"
                />
              )}
              <div
                className={`transition-opacity ${
                  dnd.arrastrada(t.id) ? "opacity-40" : ""
                }`}
              >
                <FilaTareaRoadmap
                  tarea={t}
                  seleccionada={sel.has(t.id)}
                  onToggle={onToggle}
                  agarre={dnd.agarre(t.id)}
                  esDestino={t.id === tareaDestino}
                  onReprogramadas={onReprogramadas}
                />
              </div>
            </div>
          ))}

          {lista.tareas.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-dc-muted">
              Esta lista todavía no tiene tareas.
            </div>
          )}

          {/* Alta al pie de la lista, después de la última tarea. */}
          <NuevaTareaBoton listaId={lista.id} />
        </div>
      )}
    </section>
  );
}

// El nombre de la lista sigue la misma regla que las celdas de la tabla:
// se guarda al salir del campo o con Enter, Escape cancela, sin botones.
function FormNombre({
  lista,
  onCerrar,
}: {
  lista: ListaRoadmapVista;
  onCerrar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const cancelado = useRef(false);

  const guardar = async (valor: string) => {
    const nombre = valor.trim();
    if (!nombre || nombre === lista.nombre) {
      onCerrar();
      return;
    }
    setGuardando(true);
    const fd = new FormData();
    fd.set("nombre", nombre);
    const r = await renombrarLista(lista.id, undefined, fd);
    setGuardando(false);
    if (r.error) setError(r.error);
    else onCerrar();
  };

  return (
    <span className="flex items-center gap-2">
      <input
        defaultValue={lista.nombre}
        aria-label="Nombre de la lista"
        autoComplete="off"
        autoFocus
        disabled={guardando}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelado.current = true;
            onCerrar();
          }
        }}
        onBlur={(e) => {
          if (cancelado.current) {
            cancelado.current = false;
            return;
          }
          guardar(e.target.value);
        }}
        className="w-56 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri disabled:opacity-50"
      />
      {error && (
        <span role="alert" className="text-xs text-dc-pink">
          {error}
        </span>
      )}
    </span>
  );
}

function BotonIcono({
  label,
  onClick,
  path,
}: {
  label: string;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={BTN_ICON_SM}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
}
