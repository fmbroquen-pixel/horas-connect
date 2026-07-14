// Indicadores reutilizables para secciones bloqueadas por permisos.
// Se usan en todas las secciones de solo lectura del perfil (Mis datos,
// Convenio de tarifa) para mantener un patrón visual consistente.

export function IconoCandado({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// Badge de estado (no es un botón): comunica que la sección es de solo
// lectura. Pill con el acento periwinkle, tipografía en mayúsculas y buen
// contraste, sin resultar invasivo.
export function SoloLecturaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dc-peri/30 bg-dc-peri/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-peri">
      Solo lectura
    </span>
  );
}
