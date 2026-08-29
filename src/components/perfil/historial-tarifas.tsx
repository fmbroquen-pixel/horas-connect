const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};
const ETIQUETA_OWNERSHIP: Record<string, string> = {
  owner: "Owner",
  backup: "Backup",
  valor_cero: "Valor cero",
};

export type FilaHistorial = {
  id: string;
  modalidad: string;
  ownership: string;
  valorUsd: number;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
};

// Las fechas son de calendario y se guardan a medianoche UTC: sin forzar el
// huso, un navegador al oeste de Greenwich mostraría el día anterior.
const fecha = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "UTC" });

// Historial de tarifas ya cerradas. Mismo bloque en el detalle de admin y en el
// perfil propio del mentor.
//
// Es un <details> y no un panel con estado propio: no necesita JavaScript, así
// que abre y cierra desde el primer render, sin esperar hidratación y sin
// depender de que haya frames —una pestaña en segundo plano no los emite—.
//
// Cerrado por defecto y en lista, no en tabla. Es información de consulta, no
// algo que se mire todos los días: como tabla se comía media pantalla arriba de
// los datos que sí se editan, y una tabla de cuatro columnas para cuatro datos
// que entran en un renglón era pura estructura sin nada que estructurar.
export function HistorialTarifas({ historial }: { historial: FilaHistorial[] }) {
  return (
    <details className="group rounded-2xl border border-dc-line bg-dc-card px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs uppercase tracking-wide text-dc-muted outline-none transition-colors hover:text-dc-text focus-visible:text-dc-text [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        Historial de tarifas
        {historial.length > 0 && (
          <span className="tabular-nums text-dc-muted/70">({historial.length})</span>
        )}
      </summary>

      {historial.length === 0 ? (
        <p className="mt-2 pl-6 text-xs text-dc-muted">Sin historial de tarifas.</p>
      ) : (
        // Tope de alto con scroll propio: un usuario con muchos cambios de
        // tarifa no puede empujar el resto de la pantalla hacia abajo.
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pl-6 pr-1">
          {historial.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-dc-muted"
            >
              <span className="text-dc-text">
                {ETIQUETA_MODALIDAD[t.modalidad] ?? t.modalidad}
              </span>
              <span aria-hidden>·</span>
              <span>{ETIQUETA_OWNERSHIP[t.ownership] ?? t.ownership}</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums text-dc-text">
                USD {t.valorUsd.toFixed(2)}
              </span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                {fecha(t.vigenteDesde)} – {t.vigenteHasta ? fecha(t.vigenteHasta) : "hoy"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
