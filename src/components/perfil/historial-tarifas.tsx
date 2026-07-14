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

// Tabla de solo lectura con las tarifas ya cerradas (mismo look en el detalle
// de admin y en el perfil propio del guest).
export function HistorialTarifas({ historial }: { historial: FilaHistorial[] }) {
  if (historial.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-sm uppercase text-white">
        Historial de tarifas
      </h2>
      <div className="mt-3 overflow-hidden dc-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dc-line text-left text-xs text-dc-muted">
              <th className="px-4 py-2 font-normal">Modalidad</th>
              <th className="px-4 py-2 font-normal">Ownership</th>
              <th className="px-4 py-2 font-normal">Valor USD</th>
              <th className="px-4 py-2 font-normal">Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((t) => (
              <tr
                key={t.id}
                className="border-b border-dc-line last:border-0 text-dc-muted"
              >
                <td className="px-4 py-2">{ETIQUETA_MODALIDAD[t.modalidad]}</td>
                <td className="px-4 py-2">{ETIQUETA_OWNERSHIP[t.ownership]}</td>
                <td className="px-4 py-2">{t.valorUsd.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {t.vigenteDesde.toLocaleDateString("es-AR")} –{" "}
                  {t.vigenteHasta?.toLocaleDateString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
