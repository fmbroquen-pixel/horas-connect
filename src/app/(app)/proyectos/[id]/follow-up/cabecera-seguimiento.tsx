"use client";

import { useState, useTransition } from "react";
import { guardarTablero } from "../../actions";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// El enlace al tablero de trabajo, arriba del plan.
//
// Acá vivía también el semáforo. Se mudó al Home del proyecto: es un indicador
// de estado, y su lugar es el tablero de control junto a los KPIs, no la
// pantalla donde se arma el plan. Los dos nunca tuvieron mucho que ver entre
// sí —uno es el estado del proyecto y el otro un enlace— y juntos se leían
// como un bloque de configuración.
//
// Guarda solo, con el mismo criterio del resto de la app: al salir del campo.
export function CabeceraSeguimiento({
  clienteId,
  tableroUrl,
  soloLectura = false,
}: {
  clienteId: string;
  tableroUrl: string;
  // Proyecto inactivo: el enlace se lee y se copia, no se cambia. El servidor
  // ya lo rechaza; acá se deja de ofrecer.
  soloLectura?: boolean;
}) {
  const [url, setUrl] = useState(tableroUrl);
  const [urlGuardada, setUrlGuardada] = useState(tableroUrl);
  const [error, setError] = useState<string>();
  const [pendiente, start] = useTransition();


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

  return (
    <div className="flex shrink-0 items-start gap-3">
      {/* Tablero: card propia y compacta. Solo el enlace. */}
      {/* Sin el semáforo al lado, el tablero toma la fila entera en vez de
          quedarse con su ancho viejo y dejar el hueco donde estaba el otro. */}
      <div className="min-w-0 flex-1 rounded-2xl border border-dc-line bg-dc-card px-4 py-3">
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
            // readOnly y no disabled: el enlace se tiene que poder leer entero
            // y copiar, que es "mirar". Un input deshabilitado no deja
            // seleccionar el texto.
            readOnly={soloLectura}
            data-tooltip={
              soloLectura ? MOTIVO_INACTIVO : undefined
            }
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
