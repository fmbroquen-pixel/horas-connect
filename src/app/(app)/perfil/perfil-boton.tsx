"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { subirAvatar } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_ENTRADA = 15 * 1024 * 1024; // 15 MB antes de comprimir
const LADO_MAX = 512; // px

function IconoPersona() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

// Redimensiona y comprime la imagen en el navegador. Además valida que el
// archivo sea una imagen decodificable (una imagen corrupta dispara onerror).
function comprimirImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala));
      const h = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("corrupta"));
    };
    img.src = url;
  });
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
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string>();
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

  const elegir = async (file: File | undefined) => {
    setErrorLocal(undefined);
    if (!file) return;
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setErrorLocal("Formato no permitido. Usá JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_ENTRADA) {
      setErrorLocal("La imagen es demasiado grande (máx. 15 MB).");
      return;
    }
    setProcesando(true);
    try {
      const blob = await comprimirImagen(file);
      const fd = new FormData();
      fd.set("avatar", new File([blob], "avatar.webp", { type: "image/webp" }));
      formAction(fd);
    } catch {
      setErrorLocal("No pudimos procesar la imagen. ¿Está dañada? Probá con otra.");
    } finally {
      setProcesando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const ocupado = procesando || pending;
  const error = errorLocal ?? state?.error;

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
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-dc-line">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-dc-muted">
                  <IconoPersona />
                </div>
              )}
              {ocupado && (
                <div className="absolute inset-0 flex items-center justify-center bg-dc-deep/70">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-dc-line border-t-dc-peri" />
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-dc-text">{nombre}</p>
            <p className="text-xs text-dc-muted">{rol}</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => elegir(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={ocupado}
            className={`${BTN_PRIMARY_SM} mt-4 w-full disabled:opacity-60`}
          >
            {ocupado ? "Subiendo…" : avatarUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          <p className="mt-2 text-center text-[11px] text-dc-muted">
            JPG, PNG o WebP · se optimiza automáticamente.
          </p>
          {error && (
            <p className="mt-1 text-center text-xs text-dc-pink">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
