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
  // Quién la declaró. Null en las filas anteriores a que existiera el campo:
  // se muestran sin autor en vez de atribuírselas a alguien.
  creadoPor: string | null;
};

// Las fechas son de calendario y se guardan a medianoche UTC: sin forzar el
// huso, un navegador al oeste de Greenwich mostraría el día anterior.
const fecha = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "UTC" });

// Cuatro columnas: fecha · quién · concepto · monto. El ancho de las tres
// primeras es fijo y el monto queda a la derecha, así los números se comparan
// en vertical sin tener que buscarlos.
const GRID = "grid grid-cols-[5.5rem_minmax(0,1fr)_9rem_5rem] items-baseline gap-x-3";

// Historial de tarifas ya cerradas. Mismo bloque en el detalle de admin y en el
// perfil propio del mentor.
//
// Es un <details> y no un panel con estado propio: no necesita JavaScript, así
// que abre y cierra desde el primer render, sin esperar hidratación y sin
// depender de que haya frames —una pestaña en segundo plano no los emite—.
//
// Cerrado por defecto. Es información de consulta, no algo que se mire todos los
// días: abierto se comía media pantalla arriba de los datos que sí se editan.
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
        <div className="mt-2 pl-6 pr-1">
          {/* Encabezado tenue: ordena la lectura sin convertir esto en una
              tabla. Una tabla completa —con bordes y celdas— pesaría más que
              los cuatro datos que tiene adentro. */}
          <div
            className={`${GRID} border-b border-dc-line pb-1 text-[10px] uppercase tracking-wide text-dc-muted/70`}
          >
            <span>Desde</span>
            <span>Modificó</span>
            <span>Concepto</span>
            <span className="text-right">Monto</span>
          </div>

          {/* Tope de alto con scroll propio: un usuario con muchos cambios de
              tarifa no puede empujar el resto de la pantalla hacia abajo. */}
          <ul className="max-h-56 divide-y divide-dc-line/60 overflow-y-auto">
            {historial.map((t) => (
              <li
                key={t.id}
                className={`${GRID} py-1.5 text-xs`}
                // El rango completo en el tooltip: la columna muestra desde
                // cuándo rigió, y el hasta es el desde del tramo siguiente.
                data-tooltip={`Vigente del ${fecha(t.vigenteDesde)} al ${
                  t.vigenteHasta ? fecha(t.vigenteHasta) : "hoy"
                }`}
              >
                {/* La fecha lleva la jerarquía: es por lo que se busca una
                    línea en un historial. */}
                <span className="font-semibold tabular-nums text-dc-text">
                  {fecha(t.vigenteDesde)}
                </span>
                <span className="truncate text-dc-muted">
                  {t.creadoPor ?? "—"}
                </span>
                <span className="truncate text-dc-muted">
                  {ETIQUETA_MODALIDAD[t.modalidad] ?? t.modalidad}
                  <span aria-hidden className="px-1 text-dc-muted/60">
                    ·
                  </span>
                  {ETIQUETA_OWNERSHIP[t.ownership] ?? t.ownership}
                </span>
                <span className="text-right font-semibold tabular-nums text-dc-text">
                  {t.valorUsd.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
