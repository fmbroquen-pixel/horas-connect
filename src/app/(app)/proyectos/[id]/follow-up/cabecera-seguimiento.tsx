"use client";

import { useState, useTransition } from "react";
import { cambiarSemaforo, guardarTablero } from "../../actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO, ETIQUETA_SEMAFORO } from "../../constantes";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Semáforo y tablero, arriba del plan y en cards separadas. Antes compartían
// una sola franja, pero no tienen nada que ver entre sí: uno es el estado del
// proyecto y el otro un enlace. Juntos se leían como un bloque de
// configuración y el semáforo —que es lo que se mira— perdía peso.
//
// Los dos guardan solos, con el mismo criterio del resto de la app: el
// semáforo al elegirlo y el tablero al salir del campo.
export function CabeceraSeguimiento({
  clienteId,
  semaforo: semaforoInicial,
  ultimoCambio,
  tableroUrl,
}: {
  clienteId: string;
  semaforo: string;
  ultimoCambio: string;
  tableroUrl: string;
}) {
  const [semaforo, setSemaforo] = useState(semaforoInicial);
  const [url, setUrl] = useState(tableroUrl);
  const [urlGuardada, setUrlGuardada] = useState(tableroUrl);
  const [error, setError] = useState<string>();
  const [pendiente, start] = useTransition();

  const elegirSemaforo = (valor: string) => {
    if (valor === semaforo) return;
    setSemaforo(valor);
    start(async () => {
      await cambiarSemaforo(clienteId, valor);
    });
  };

  const guardarUrl = () => {
    const limpia = url.trim();
    if (limpia === urlGuardada) return;
    start(async () => {
      const fd = new FormData();
      fd.set("tableroUrl", limpia);
      const r = await guardarTablero(clienteId, undefined, fd);
      if (r.error) {
        setError(r.error);
        setUrl(urlGuardada); // rechazado: vuelve al último valor bueno
      } else {
        setError(undefined);
        setUrlGuardada(limpia);
      }
    });
  };

  // El último cambio se cuenta al pasar por encima, no ocupando una línea
  // permanente: es un dato de contexto que se consulta de vez en cuando, no
  // algo que haya que leer cada vez que se abre el plan.
  const detalleUltimoCambio = ultimoCambio
    ? `Último cambio: ${ETIQUETA_SEMAFORO[semaforoInicial] ?? "—"} · ${ultimoCambio}`
    : "Sin cambios registrados";

  return (
    <div className="flex shrink-0 flex-wrap items-start gap-3">
      {/* Semáforo: los tres estados a la vista y a un clic. El desplegable
          escondía tres opciones detrás de dos clics para algo que se cambia
          seguido y que además es un color, no un texto. */}
      <div
        className="rounded-2xl border border-dc-line bg-dc-card px-4 py-3"
        data-tooltip={detalleUltimoCambio}
      >
        <span className="mb-2 block text-[11px] uppercase tracking-wide text-dc-muted">
          Semáforo
        </span>
        <div role="group" aria-label="Semáforo del proyecto" className="flex gap-1.5">
          {OPCIONES_SEMAFORO.map((o) => {
            const activo = semaforo === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => elegirSemaforo(o.value)}
                disabled={pendiente}
                aria-pressed={activo}
                data-tooltip={`${o.label} — ${detalleUltimoCambio}`}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-60 ${
                  activo
                    ? "border-transparent text-dc-text"
                    : "border-dc-line text-dc-muted hover:border-dc-peri hover:text-dc-text"
                }`}
                // El estado activo se marca con el propio color del semáforo,
                // en fondo tenue y con glow: es la única señal que no depende
                // de leer la etiqueta.
                style={
                  activo
                    ? {
                        backgroundColor: `${COLOR_SEMAFORO[o.value]}22`,
                        boxShadow: `0 0 10px ${COLOR_SEMAFORO[o.value]}55`,
                      }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_SEMAFORO[o.value] }}
                />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablero: card propia y compacta. Solo el enlace. */}
      <div className="min-w-[18rem] flex-1 rounded-2xl border border-dc-line bg-dc-card px-4 py-3">
        <span className="mb-2 block text-[11px] uppercase tracking-wide text-dc-muted">
          Tablero
        </span>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={guardarUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            disabled={pendiente}
            placeholder="https://…"
            autoComplete="off"
            aria-label="Enlace del tablero de trabajo"
            className={INPUT}
          />
          {urlGuardada && (
            <a
              href={urlGuardada}
              target="_blank"
              rel="noreferrer"
              data-tooltip="Abrir tablero"
              aria-label="Abrir tablero"
              className="shrink-0 rounded-lg p-1.5 text-dc-muted transition hover:text-dc-peri"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14L21 3" />
              </svg>
            </a>
          )}
        </div>
        {error && (
          <p className="mt-2 text-xs text-dc-pink" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
