"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { POPOVER_FLOTANTE, usePopoverFlotante } from "@/components/ui/popover-flotante";
import {
  DIAS_SEMANA,
  MESES,
  esFinDeSemana,
  fromISO,
  offsetLunes,
  toISO,
} from "@/lib/fecha-iso";

export type Rango = { inicio: string; fin: string };

// Inicio y Fin de una tarea, editados desde UN solo calendario de rango.
//
// Son dos columnas separadas en la tabla —se leen distinto— pero una sola
// decisión: "esta tarea va de acá hasta acá". Editarlas por separado obligaba
// a dos aperturas, dos guardados y dos recálculos de la cadena, con un estado
// intermedio incoherente en el medio (el fin viejo con el inicio nuevo).
//
// Devuelve dos celdas hermanas, sin envoltorio: el llamador las coloca en su
// grilla como cualquier otro par de columnas.
//
// Solo días hábiles: el plan se secuencia en días hábiles, así que un sábado
// no es una fecha que la tarea pueda tomar. Los fines de semana se dibujan
// deshabilitados en vez de esconderse, para no romper la lectura del mes.
export function RangoFechas({
  rango,
  onGuardar,
  mostrar,
  editable = true,
  onAbiertoChange,
}: {
  rango: Rango;
  onGuardar: (r: Rango) => Promise<{ error?: string }>;
  mostrar: (iso: string) => string;
  editable?: boolean;
  // Avisa cuándo el calendario está abierto, para que la fila entera pueda
  // destacarse. El calendario se dibuja en un portal y termina tapando parte
  // de la tabla: sin la fila marcada se pierde de vista sobre qué tarea se
  // está operando.
  onAbiertoChange?: (abierto: boolean) => void;
}) {
  const [servidor, setServidor] = useState(rango);
  const [local, setLocal] = useState(rango);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  // Selección en curso: cuando hay `desde` sin `hasta`, el próximo clic cierra
  // el rango. Null = todavía no se tocó nada en esta apertura.
  const [parcial, setParcial] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(() => fromISO(rango.inicio) ?? new Date());

  const anclaInicio = useRef<HTMLSpanElement>(null);
  const anclaFin = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Desde qué columna se abrió: el calendario se ancla ahí.
  const [desdeColumna, setDesdeColumna] = useState<"inicio" | "fin">("inicio");

  // El servidor manda: si llega un rango nuevo (revalidación tras guardar, o
  // un cambio hecho desde otro lado) pisa lo local.
  if (rango.inicio !== servidor.inicio || rango.fin !== servidor.fin) {
    setServidor(rango);
    setLocal(rango);
    setError(undefined);
  }

  const ancla = desdeColumna === "inicio" ? anclaInicio : anclaFin;
  usePopoverFlotante(abierto, ancla, popRef, { centrar: true });

  const abrir = (columna: "inicio" | "fin") => {
    if (!editable) return;
    onAbiertoChange?.(true);
    setDesdeColumna(columna);
    setParcial(null);
    setHover(null);
    setCursor(fromISO(local[columna === "inicio" ? "inicio" : "fin"]) ?? new Date());
    setAbierto(true);
  };

  const cerrar = () => {
    onAbiertoChange?.(false);
    setAbierto(false);
    setParcial(null);
    setHover(null);
  };

  // Cancela: descarta lo que se haya elegido en esta apertura.
  const cancelar = () => {
    setLocal(servidor);
    cerrar();
  };

  const guardar = async (r: Rango) => {
    cerrar();
    if (r.inicio === servidor.inicio && r.fin === servidor.fin) return;
    setLocal(r);
    setGuardando(true);
    const res = await onGuardar(r);
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setLocal(servidor);
    } else {
      setError(undefined);
    }
  };

  // Clic afuera: confirma. Un rango a medias (solo se eligió el inicio) se
  // cierra sobre sí mismo — una tarea de un día hábil, que es el mínimo que
  // admite la secuencia.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        anclaInicio.current?.contains(t) ||
        anclaFin.current?.contains(t) ||
        popRef.current?.contains(t)
      ) {
        return;
      }
      if (parcial) guardar({ inicio: parcial, fin: parcial });
      else cerrar();
    };
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelar();
      }
    };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
    };
  });

  const elegir = (d: Date) => {
    if (esFinDeSemana(d)) return;
    const iso = toISO(d);
    if (!parcial) {
      // Primer clic: arranca un rango nuevo.
      setParcial(iso);
      setLocal({ inicio: iso, fin: iso });
      return;
    }
    // Segundo clic: si cae antes del inicio, se toma como inicio nuevo en vez
    // de rechazarlo — es lo que la persona quiso decir.
    if (iso < parcial) {
      setParcial(iso);
      setLocal({ inicio: iso, fin: iso });
      return;
    }
    guardar({ inicio: parcial, fin: iso });
  };

  // Lo que se pinta: el rango confirmado, o el que se está armando siguiendo
  // el mouse.
  const pintado: Rango = parcial
    ? { inicio: parcial, fin: hover && hover > parcial ? hover : parcial }
    : local;

  const celda = (columna: "inicio" | "fin") => {
    const valor = local[columna];
    const ref = columna === "inicio" ? anclaInicio : anclaFin;
    return (
      <span ref={ref} className="relative block min-w-0">
        <span className={guardando ? "block opacity-45 transition-opacity" : "block"}>
          {editable ? (
            <button
              type="button"
              onClick={() => abrir(columna)}
              aria-haspopup="dialog"
              aria-expanded={abierto && desdeColumna === columna}
              aria-label={columna === "inicio" ? "Fecha de inicio" : "Fecha de fin"}
              // Con el calendario abierto, las DOS celdas se marcan: el rango
              // es una sola decisión, así que destacar solo la que se tocó
              // sugeriría que la otra no está en juego.
              //
              // El énfasis es una sombra oscura y difusa detrás de la fecha,
              // sobre --dc-sidebar (el violeta más profundo de la paleta, no
              // negro puro: así no ensucia el fondo). La fecha conserva su
              // color de siempre; lo único que cambia es que gana profundidad.
              //
              // Dos capas de blur grande y sin desplazamiento: un offset corto
              // marcaría un contorno nítido, y lo que se busca es lo contrario
              // —que la sombra se disuelva y no se lea como un borde ni como
              // un recuadro. Nada de fondo ni de box-shadow, por lo mismo.
              //
              // Es solo text-shadow, que no ocupa espacio: la grilla no se
              // mueve un píxel al abrir.
              className={`flex w-full items-center justify-center rounded-md px-1.5 py-1 text-center text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 ${
                abierto
                  ? "[text-shadow:0_0_12px_rgba(11,9,48,0.85),0_0_26px_rgba(11,9,48,0.6)]"
                  : "hover:bg-dc-peri/10"
              }`}
            >
              <span className="truncate tabular-nums">{mostrar(valor)}</span>
            </button>
          ) : (
            <span className="block truncate px-1.5 py-1 text-center text-sm text-dc-text tabular-nums">
              {mostrar(valor)}
            </span>
          )}
        </span>
        {/* El error se muestra una sola vez, colgado del Inicio, para no
            duplicar el mismo mensaje en las dos columnas. */}
        {error && columna === "inicio" && (
          <span
            role="alert"
            title={error}
            className="mt-0.5 block truncate text-[11px] leading-tight text-dc-pink"
          >
            {error}
          </span>
        )}
      </span>
    );
  };

  // Grilla del mes visible.
  const primero = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicioGrilla = new Date(primero);
  inicioGrilla.setDate(1 - offsetLunes(primero));
  const celdas: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrilla);
    d.setDate(inicioGrilla.getDate() + i);
    celdas.push(d);
  }

  return (
    <>
      {celda("inicio")}
      {celda("fin")}

      {abierto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Elegir inicio y fin"
            className={`${POPOVER_FLOTANTE} w-72 p-3`}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-sm text-dc-text">
                {MESES[cursor.getMonth()]} {cursor.getFullYear()}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>

            <p className="mb-2 text-center text-[11px] text-dc-muted">
              {parcial ? "Ahora elegí el fin" : "Elegí el inicio"}
            </p>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-dc-muted">
              {DIAS_SEMANA.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-x-0 gap-y-0.5" onMouseLeave={() => setHover(null)}>
              {celdas.map((d) => {
                const iso = toISO(d);
                const otroMes = d.getMonth() !== cursor.getMonth();
                const finde = esFinDeSemana(d);
                const esInicio = iso === pintado.inicio;
                const esFin = iso === pintado.fin;
                const esUnico = esInicio && esFin;
                const dentro = iso > pintado.inicio && iso < pintado.fin;

                let redondeo = "rounded-lg";
                let base = otroMes
                  ? "text-dc-muted/40 hover:bg-dc-line/30"
                  : "text-dc-text hover:bg-dc-line/40";
                if (esInicio || esFin) {
                  base =
                    "bg-dc-peri text-white [text-shadow:0_0_10px_rgba(255,145,255,0.45)] font-medium hover:brightness-110";
                  redondeo = esUnico
                    ? "rounded-lg"
                    : esInicio
                      ? "rounded-l-lg rounded-r-none"
                      : "rounded-r-lg rounded-l-none";
                } else if (dentro) {
                  base = "bg-dc-peri/15 text-dc-text hover:bg-dc-peri/25";
                  redondeo = "rounded-none";
                }

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={finde}
                    onClick={() => elegir(d)}
                    onMouseEnter={() => setHover(iso)}
                    className={`h-8 text-center text-sm transition ${redondeo} ${base} disabled:cursor-not-allowed disabled:bg-transparent disabled:text-dc-muted/25 disabled:hover:bg-transparent`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
