"use client";

import { useEffect, useState } from "react";

type ValoresActuales = {
  presencialOwner?: number;
  presencialBackup?: number;
  virtualOwner?: number;
  virtualBackup?: number;
};

function IconoCandado({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Campo({ label, valor }: { label: string; valor?: number }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-dc-muted">{label}</label>
      <input
        type="text"
        value={valor !== undefined ? valor.toFixed(2) : "—"}
        disabled
        readOnly
        tabIndex={-1}
        className="w-full cursor-not-allowed rounded-lg border border-dc-line bg-dc-deeper/60 px-3 py-2 text-sm text-dc-muted outline-none"
      />
    </div>
  );
}

export function TarifaReadOnly({
  tipoActual,
  valores,
  adminsEmails,
}: {
  tipoActual: "fija" | "variable" | null;
  valores: ValoresActuales;
  adminsEmails: string[];
}) {
  const [modal, setModal] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const tipo = tipoActual ?? "variable";
  const valorFija =
    valores.presencialOwner ??
    valores.presencialBackup ??
    valores.virtualOwner ??
    valores.virtualBackup;

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dc-muted">
          <IconoCandado />
        </span>
        <h2 className="font-display text-sm uppercase text-white">
          Convenio de tarifa
        </h2>
        <span className="rounded-full border border-dc-line bg-dc-deeper px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-dc-muted">
          Solo lectura
        </span>
      </div>
      <p className="mt-1 text-xs text-dc-muted">
        Solo los usuarios Admin pueden modificar el convenio de tarifa.
      </p>

      {/* Campos deshabilitados + capa que comunica el bloqueo (hover/tap). */}
      <div className="relative mt-4">
        <div aria-hidden="true">
          <p className="mb-2 text-xs text-dc-muted">
            Tipo de tarifa:{" "}
            <span className="text-dc-text">
              {tipo === "fija" ? "Fija" : "Variable (por modalidad y ownership)"}
            </span>
          </p>
          {tipo === "fija" ? (
            <Campo label="Valor USD por hora (presencial y virtual)" valor={valorFija} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Presencial · Owner" valor={valores.presencialOwner} />
              <Campo label="Presencial · Backup" valor={valores.presencialBackup} />
              <Campo label="Virtual · Owner" valor={valores.virtualOwner} />
              <Campo label="Virtual · Backup" valor={valores.virtualBackup} />
            </div>
          )}
        </div>

        {/* Capa transparente: hover = tooltip, click/tap/enter = modal. */}
        <button
          type="button"
          onClick={() => setModal(true)}
          onMouseEnter={() => setTooltip(true)}
          onMouseLeave={() => setTooltip(false)}
          onFocus={() => setTooltip(true)}
          onBlur={() => setTooltip(false)}
          aria-label="Convenio de tarifa: solo editable por administradores"
          className="absolute inset-0 cursor-not-allowed rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/60"
        >
          {tooltip && (
            <span className="dc-menu dc-pop-in pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-dc-line bg-dc-deep px-3 py-1.5 text-xs text-dc-text shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              🔒 Solo editable por administradores.
            </span>
          )}
        </button>
      </div>

      {modal && (
        <div
          className="dc-page-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Convenio de tarifa bloqueado"
            onClick={(e) => e.stopPropagation()}
            className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center gap-2 text-dc-peri">
              <IconoCandado size={20} />
              <h3 className="font-display text-sm uppercase text-white">
                Convenio de tarifa
              </h3>
            </div>
            <p className="mt-3 text-sm text-dc-muted">
              Solo un usuario <strong className="text-dc-text">Admin</strong> puede
              modificar el convenio de tarifa. Si necesitás un cambio,
              solicitáselo a un administrador:
            </p>
            {adminsEmails.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {adminsEmails.map((email) => (
                  <li key={email}>
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text transition hover:border-dc-peri hover:text-dc-peri"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-dc-muted">
                No hay administradores configurados en este momento.
              </p>
            )}
            <button
              type="button"
              onClick={() => setModal(false)}
              className="mt-5 w-full rounded-xl bg-dc-purple px-4 py-2 text-sm text-white transition hover:brightness-110"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
