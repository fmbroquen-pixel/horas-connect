"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listarEliminados,
  restaurarItem,
  type ItemEliminado,
  type TipoEliminado,
} from "./actions";
import { RETENCION_DIAS } from "./constantes";
import { Modal } from "@/components/ui/modal";
import { BTN_SECONDARY_SM } from "@/lib/ui";

// Papelera contextual de un módulo: muestra únicamente los registros
// eliminados de ese tipo. Única acción disponible: Restaurar. Se abre desde el
// menú de acciones (⋮) del historial.
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

  useEffect(() => {
    if (!open) return;
    startCarga(async () => setItems(await listarEliminados(tipo)));
  }, [open, tipo]);

  const restaurar = (item: ItemEliminado) => {
    startRestaurar(async () => {
      await restaurarItem(item.tipo, item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
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
                    <p className="text-dc-text">{i.resumen}</p>
                    <button
                      type="button"
                      disabled={restaurando}
                      onClick={() => restaurar(i)}
                      className={BTN_SECONDARY_SM}
                    >
                      Restaurar
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-dc-muted">
                    {i.diasRestantes > 0
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
