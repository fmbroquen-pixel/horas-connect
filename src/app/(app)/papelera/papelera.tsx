"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  listarEliminados,
  restaurarItem,
  type ItemEliminado,
} from "./actions";
import { BTN_SECONDARY_SM } from "@/lib/ui";

export function Papelera() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ItemEliminado[] | null>(null);
  const [cargando, startCarga] = useTransition();
  const [restaurando, startRestaurar] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const cargar = () => {
    startCarga(async () => setItems(await listarEliminados()));
  };

  const toggle = () => {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (nuevo) cargar();
  };

  const restaurar = (item: ItemEliminado) => {
    startRestaurar(async () => {
      await restaurarItem(item.tipo, item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    });
  };

  // Cerrar al hacer click afuera.
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        title="Papelera de reciclaje"
        aria-label="Papelera de reciclaje"
        className="rounded-lg border border-dc-line px-2.5 py-1.5 text-base leading-none text-dc-muted transition hover:border-dc-peri hover:text-dc-text"
      >
        🗑️
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-dc-line bg-dc-deep p-3 shadow-xl">
          <p className="mb-2 font-display text-xs uppercase tracking-widest text-dc-pink">
            Papelera
          </p>
          {cargando && !items ? (
            <p className="py-4 text-center text-xs text-dc-muted">Cargando…</p>
          ) : items && items.length > 0 ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {items.map((i) => (
                <li
                  key={`${i.tipo}-${i.id}`}
                  className="rounded-lg border border-dc-line p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-dc-peri/15 px-2 py-0.5 text-[10px] text-dc-peri">
                      {i.seccion}
                    </span>
                    <button
                      type="button"
                      disabled={restaurando}
                      onClick={() => restaurar(i)}
                      className={BTN_SECONDARY_SM}
                    >
                      Restaurar
                    </button>
                  </div>
                  <p className="mt-1 text-dc-text">{i.resumen}</p>
                  <p className="mt-0.5 text-[10px] text-dc-muted">
                    Eliminado el{" "}
                    {new Date(i.eliminadoEn).toLocaleDateString("es-AR")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-dc-muted">
              La papelera está vacía.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
