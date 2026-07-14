"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  analizarImportacion,
  confirmarImportacion,
  type Preview,
} from "./importar/actions";
import { BTN_PRIMARY, BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";

export function ImportarModal({ onCerrar }: { onCerrar: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [resultado, setResultado] = useState<{ importadas: number; omitidas: number } | null>(null);
  const [error, setError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [analizando, startAnalizar] = useTransition();
  const [importando, startImportar] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const elegirArchivo = (f: File | null) => {
    setArchivo(f);
    setPreview(null);
    setResultado(null);
    setError(undefined);
    if (f) {
      const fd = new FormData();
      fd.set("archivo", f);
      startAnalizar(async () => {
        const p = await analizarImportacion(undefined, fd);
        if (p.error) setError(p.error);
        else setPreview(p);
      });
    }
  };

  const importar = () => {
    if (!archivo) return;
    const fd = new FormData();
    fd.set("archivo", archivo);
    startImportar(async () => {
      const r = await confirmarImportacion(undefined, fd);
      if (r.error) setError(r.error);
      else setResultado({ importadas: r.importadas ?? 0, omitidas: r.omitidas ?? 0 });
    });
  };

  return (
    <div
      className="dc-page-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar horas"
        onClick={(e) => e.stopPropagation()}
        className="dc-menu dc-pop-in max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-sm uppercase text-white">Importar horas</h2>
            <p className="mt-1 text-xs text-dc-muted">
              Formatos aceptados: Excel (.xlsx) y CSV.
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={BTN_SECONDARY_SM}>
            ✕
          </button>
        </div>

        {!resultado && (
          <>
            <div className="mt-4 rounded-xl border border-dc-line bg-dc-deeper/40 p-3 text-xs text-dc-muted">
              <p className="text-dc-text">Columnas obligatorias:</p>
              <p className="mt-1">Fecha · Proyecto · Etapa · Ownership · Horas · Modalidad</p>
              <p className="mt-2">
                No incluyas <strong className="text-dc-text">USD/Hora</strong> ni{" "}
                <strong className="text-dc-text">USD Total</strong>: los calcula el
                sistema. Fecha en formato AAAA-MM-DD o DD/MM/AAAA; horas como
                número (1,5) o hora:minuto (1:30).
              </p>
              <a href="/timetracker/plantilla" className="mt-2 inline-block text-dc-peri hover:text-dc-pink">
                Descargar plantilla
              </a>
            </div>

            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                elegirArchivo(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition ${
                dragOver ? "border-dc-peri bg-dc-peri/10 text-dc-text" : "border-dc-line text-dc-muted"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              />
              {archivo ? (
                <span className="text-dc-text">{archivo.name}</span>
              ) : (
                <>
                  <span>Arrastrá el archivo acá o hacé click para elegirlo</span>
                </>
              )}
            </label>

            {analizando && <p className="mt-3 text-xs text-dc-muted">Analizando…</p>}
            {error && <p className="mt-3 text-xs text-dc-pink">{error}</p>}

            {preview && (
              <div className="mt-4">
                {preview.columnasFaltantes.length > 0 && (
                  <p className="rounded-lg border border-dc-pink/40 bg-dc-pink/10 px-3 py-2 text-xs text-dc-pink">
                    Faltan columnas obligatorias: {preview.columnasFaltantes.join(", ")}
                  </p>
                )}
                {preview.columnasDesconocidas.length > 0 && (
                  <p className="mt-2 text-xs text-dc-muted">
                    Columnas ignoradas: {preview.columnasDesconocidas.join(", ")}
                  </p>
                )}

                <div className="mt-3 flex gap-3 text-sm">
                  <span className="rounded-lg bg-dc-peri/15 px-3 py-1 text-dc-peri">
                    {preview.validas} válidas
                  </span>
                  <span className="rounded-lg bg-dc-pink/15 px-3 py-1 text-dc-pink">
                    {preview.conError} con error
                  </span>
                </div>

                {preview.conError > 0 && (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-dc-line">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-dc-deep">
                        <tr className="text-dc-muted">
                          <th className="px-2 py-1 text-left">Fila</th>
                          <th className="px-2 py-1 text-left">Errores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.filas
                          .filter((f) => f.errores.length > 0)
                          .map((f) => (
                            <tr key={f.fila} className="border-t border-dc-line/60">
                              <td className="px-2 py-1 text-dc-muted">{f.fila}</td>
                              <td className="px-2 py-1 text-dc-pink">
                                {f.errores.join(" · ")}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={importar}
                    disabled={importando || preview.validas === 0}
                    className={BTN_PRIMARY}
                  >
                    {importando
                      ? "Importando…"
                      : `Importar ${preview.validas} válidas`}
                  </button>
                  <button type="button" onClick={() => inputRef.current?.click()} className={BTN_SECONDARY_SM}>
                    Cambiar archivo
                  </button>
                </div>
                {preview.conError > 0 && (
                  <p className="mt-2 text-xs text-dc-muted">
                    Solo se importan las filas válidas; las {preview.conError} con
                    error se omiten.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {resultado && (
          <div className="mt-6 text-center">
            <p className="text-sm text-dc-text">
              Se importaron <strong>{resultado.importadas}</strong> registros.
            </p>
            {resultado.omitidas > 0 && (
              <p className="mt-1 text-xs text-dc-muted">
                Se omitieron {resultado.omitidas} filas con error.
              </p>
            )}
            <button type="button" onClick={onCerrar} className={`${BTN_PRIMARY_SM} mt-4`}>
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
