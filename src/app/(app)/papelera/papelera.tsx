"use client";

import { useEffect, useState, useTransition } from "react";
import {
  eliminarDefinitivo,
  listarEliminados,
  restaurarItem,
  type ItemEliminado,
  type TipoEliminado,
} from "./actions";
import { RETENCION_DIAS } from "./constantes";
import { Modal } from "@/components/ui/modal";
import { BTN_SECONDARY_SM, BTN_DANGER_SM, BTN_DANGER_CONFIRM_SM } from "@/lib/ui";
import { avisarOk } from "@/components/ui/avisos";

// Mensajes completos por tipo y no una etiqueta + sufijo: el género cambia
// ("Hora restaurada" pero "Viático restaurado") y armarlo por concatenación
// obliga a elegir una sola terminación que va a estar mal para la mitad.
const RESTAURADO: Record<TipoEliminado, string> = {
  hora: "Hora restaurada",
  viatico: "Viático restaurado",
  vacacion: "Licencia restaurada",
  roadmap: "Ítem del plan restaurado",
};
const BORRADO: Record<TipoEliminado, string> = {
  hora: "Hora eliminada definitivamente",
  viatico: "Viático eliminado definitivamente",
  vacacion: "Licencia eliminada definitivamente",
  roadmap: "Ítem del plan eliminado definitivamente",
};

// Papelera contextual de un módulo: muestra únicamente los registros
// eliminados de ese tipo. Se abre desde el menú de acciones (⋮).
//
// Restaurar está siempre. Eliminar definitivamente solo en Follow Up: en los
// otros módulos el borrado definitivo lo hace el cron al vencer el plazo, y
// no hacía falta una forma manual de adelantarlo. Acá sí, porque una lista
// borrada de un plan grande es ruido que conviene poder sacar de una.
export function PapeleraModal({
  tipo,
  open,
  onClose,
}: {
  tipo: TipoEliminado;
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ItemEliminado[] | null>(null);
  const [cargando, startCarga] = useTransition();
  const [restaurando, startRestaurar] = useTransition();
  // Id que está esperando confirmación de borrado definitivo. Dos pasos, como
  // el resto de los borrados de la app: el primer clic arma, el segundo
  // ejecuta.
  const [porBorrar, setPorBorrar] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    startCarga(async () => setItems(await listarEliminados(tipo)));
  }, [open, tipo]);

  const restaurar = (item: ItemEliminado) => {
    startRestaurar(async () => {
      await restaurarItem(item.tipo, item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      avisarOk(RESTAURADO[item.tipo]);
    });
  };

  const borrarParaSiempre = (item: ItemEliminado) => {
    setPorBorrar(null);
    startRestaurar(async () => {
      await eliminarDefinitivo(item.tipo, item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      avisarOk(BORRADO[item.tipo]);
    });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="titulo-papelera">
      <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <h2 id="titulo-papelera" className="font-display text-sm uppercase text-white">
          Papelera
        </h2>
        <p className="mt-1 text-xs text-dc-muted">
          Los registros eliminados se conservan durante {RETENCION_DIAS} días y
          luego se eliminan automáticamente.
        </p>

        <div className="mt-4">
          {cargando && !items ? (
            <p className="py-6 text-center text-sm text-dc-muted">Cargando…</p>
          ) : items && items.length > 0 ? (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-dc-line p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] uppercase tracking-wide text-dc-muted">
                        {i.seccion}
                      </p>
                      <p className="text-dc-text">{i.resumen}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={restaurando}
                        onClick={() => restaurar(i)}
                        className={BTN_SECONDARY_SM}
                      >
                        Restaurar
                      </button>
                      {tipo === "roadmap" &&
                        (porBorrar === i.id ? (
                          <button
                            type="button"
                            disabled={restaurando}
                            onClick={() => borrarParaSiempre(i)}
                            className={BTN_DANGER_CONFIRM_SM}
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={restaurando}
                            onClick={() => setPorBorrar(i.id)}
                            className={BTN_DANGER_SM}
                          >
                            Eliminar
                          </button>
                        ))}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-dc-muted">
                    {porBorrar === i.id
                      ? "Se elimina para siempre. Esto no se puede deshacer."
                      : i.diasRestantes > 0
                        ? `Se eliminará en ${i.diasRestantes} día${i.diasRestantes === 1 ? "" : "s"}`
                        : "Se eliminará hoy"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-dc-muted">
              La papelera está vacía.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
