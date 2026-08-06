"use client";

import { useState, useTransition } from "react";
import { cambiarSemaforo, guardarTablero } from "../../actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO, ETIQUETA_SEMAFORO } from "../../constantes";
import { Dropdown } from "@/components/dropdown";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Semáforo y tablero de trabajo, en una franja de baja altura arriba del
// plan. Antes vivían en una pestaña propia (Seguimiento) que solo tenía
// estos dos campos: como el seguimiento se hace mirando el plan, tenerlos a
// la vista acá ahorra un salto de pantalla.
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

  return (
    <div className="shrink-0 rounded-2xl border border-dc-line bg-dc-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-dc-muted">
            Semáforo
          </span>
          {semaforo && (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: COLOR_SEMAFORO[semaforo],
                boxShadow: `0 0 8px ${COLOR_SEMAFORO[semaforo]}`,
              }}
            />
          )}
          <Dropdown
            value={semaforo}
            onChange={elegirSemaforo}
            options={OPCIONES_SEMAFORO}
            placeholder="Sin registrar"
            className="w-40"
            ariaLabel="Semáforo del proyecto"
          />
          <span className="text-xs text-dc-muted">
            {ultimoCambio
              ? `Último cambio: ${ETIQUETA_SEMAFORO[semaforoInicial] ?? ""} · ${ultimoCambio}`
              : "Sin cambios registrados"}
          </span>
        </div>

        <label className="flex min-w-[16rem] flex-1 items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-dc-muted">
            Tablero
          </span>
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
              title="Abrir tablero"
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
        </label>
      </div>

      {error && (
        <p className="mt-2 text-xs text-dc-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
