// El candado que ocupa el lugar de las acciones cuando una fila es histórica.
//
// Ocupa lugar en vez de dejar el carril vacío a propósito: una fila sin botones
// se lee como una fila a la que todavía no le llegaron, y el motivo —el cliente
// está inactivo— no se deduce mirando la tabla. El tooltip lo dice.
export function IconoSoloLectura({ motivo }: { motivo: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center text-dc-muted/60"
      data-tooltip={motivo}
      aria-label={motivo}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}
