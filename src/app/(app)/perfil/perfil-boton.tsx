"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { subirAvatar } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";

function IconoPersona() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function PerfilBoton({
  nombre,
  rol,
  avatarUrl,
}: {
  nombre: string;
  rol: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof subirAvatar>> | undefined, fd: FormData) => {
      const r = await subirAvatar(prev, fd);
      if (r.ok) setOpen(false);
      return r;
    },
    undefined,
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative flex items-center gap-3" ref={ref}>
      <div className="text-right">
        <p className="text-dc-text">{nombre}</p>
        <p className="text-xs text-dc-muted">{rol}</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Perfil"
        aria-label="Perfil"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-dc-line text-dc-muted transition hover:border-dc-peri hover:text-dc-text"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <IconoPersona />
        )}
      </button>

      {open && (
        <div className="dc-menu dc-pop-in absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-dc-line bg-dc-deep p-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-dc-line">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-dc-muted">
                  <IconoPersona />
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-dc-text">{nombre}</p>
            <p className="text-xs text-dc-muted">{rol}</p>
          </div>

          <form action={formAction} className="mt-4">
            <input
              ref={fileRef}
              name="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.length) e.currentTarget.form?.requestSubmit();
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className={`${BTN_PRIMARY_SM} w-full`}
            >
              {pending ? "Subiendo…" : avatarUrl ? "Cambiar foto" : "Subir foto"}
            </button>
            {state?.error && (
              <p className="mt-2 text-center text-xs text-dc-pink">{state.error}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
