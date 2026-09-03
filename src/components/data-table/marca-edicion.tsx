// Señal de que una fila fue editada después de cargarse.
//
// Es un ícono tenue con el detalle en el tooltip, no una columna: el dato se
// consulta de vez en cuando —"¿quién cambió esto?"— y no merece robarle ancho
// permanente a lo que sí se lee en cada pantalla.
//
// Cuando el registro nunca se editó no se dibuja nada, así que la marca ES la
// información: si está, alguien lo tocó.
export function MarcaEdicion({ detalle }: { detalle: string | null }) {
  if (!detalle) return null;
  return (
    <span
      data-tooltip={detalle}
      aria-label={detalle}
      className="inline-flex shrink-0 text-dc-muted/70"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
      </svg>
    </span>
  );
}
