"use client";

import { useState } from "react";

// Reordenar por arrastre, con el drag-and-drop nativo del navegador.
//
// Nativo y no una librería: `draggable` ya implementa exactamente el gesto
// que se pide —mantener presionado y mover para empezar— y, sobre todo, el
// navegador NO emite click cuando hubo arrastre real. Eso es lo que hace que
// esto conviva sin trucos con el plegado de la lista, los checkboxes, la
// edición inline y los botones: si soltaste sin mover, es un clic normal.
//
// El agarre y la zona de destino son elementos distintos a propósito: se
// arrastra desde un lugar acotado (el header de la lista, la celda del
// checkbox de la tarea) pero se puede soltar sobre la fila entera.
export type Reordenable = {
  // Va en el elemento desde el que se puede empezar a arrastrar.
  agarre: (id: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  // Va en el contenedor de cada ítem: define dónde se puede soltar.
  zona: (id: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  // Para el feedback visual.
  arrastrada: (id: string) => boolean;
  // true cuando el ítem que se arrastra caería justo ANTES de este.
  marcaAntes: (id: string) => boolean;
  activo: boolean;
  // Orden a dibujar: el optimista mientras el servidor confirma, o el del
  // servidor. El llamador ordena sus ítems por esto.
  orden: string[];
};

// El cálculo del orden final, aparte del hook para poder probarlo: saca el
// que se arrastra y lo vuelve a insertar en la posición del que recibe el
// drop. Devuelve null si no hay nada que cambiar —soltar sobre sí mismo, o
// sobre algo que no está en la lista.
export function moverEnOrden(
  ids: string[],
  desde: string,
  sobre: string,
): string[] | null {
  if (desde === sobre) return null;
  const orden = ids.filter((x) => x !== desde);
  if (orden.length === ids.length) return null; // `desde` no estaba
  const i = orden.indexOf(sobre);
  if (i < 0) return null;
  orden.splice(i, 0, desde);
  return orden.join() === ids.join() ? null : orden;
}

export function useReordenable(
  ids: string[],
  onReordenar: (idsEnOrden: string[]) => void,
): Reordenable {
  const [origen, setOrigen] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  // Orden mostrado mientras el servidor confirma. El plan es secuencial:
  // guardar el orden nuevo implica además recalcular las fechas de todo lo
  // que sigue, y eso tarda. Sin esto la fila se quedaba quieta hasta que
  // volvía la respuesta y parecía que el arrastre no había hecho nada.
  const [optimista, setOptimista] = useState<string[] | null>(null);

  // Cuando llega el orden del servidor, manda él: si coincide con lo que ya
  // se mostraba el usuario no ve ningún salto, y si el servidor rechazó el
  // movimiento la lista vuelve sola a la verdad.
  const [ultimoServidor, setUltimoServidor] = useState(ids);
  if (ids.join() !== ultimoServidor.join()) {
    setUltimoServidor(ids);
    setOptimista(null);
  }

  const visibles = optimista ?? ids;

  const soltar = (sobre: string) => {
    const desde = origen;
    setOrigen(null);
    setDestino(null);
    if (!desde) return;

    // Solo se avisa si el orden cambió de verdad: soltar en el mismo lugar no
    // tiene por qué disparar una escritura ni un recálculo de fechas.
    const orden = moverEnOrden(visibles, desde, sobre);
    if (!orden) return;
    setOptimista(orden);
    onReordenar(orden);
  };

  return {
    agarre: (id) => ({
      draggable: true,
      onDragStart: (e) => {
        setOrigen(id);
        e.dataTransfer.effectAllowed = "move";
        // Firefox no arranca el arrastre sin datos asociados.
        e.dataTransfer.setData("text/plain", id);
      },
      onDragEnd: () => {
        setOrigen(null);
        setDestino(null);
      },
    }),
    zona: (id) => ({
      onDragOver: (e) => {
        if (!origen || origen === id) return;
        // Sin preventDefault el navegador no considera esto un destino
        // válido y no dispara el drop.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (destino !== id) setDestino(id);
      },
      onDrop: (e) => {
        e.preventDefault();
        soltar(id);
      },
    }),
    orden: visibles,
    arrastrada: (id) => origen === id,
    marcaAntes: (id) => destino === id && origen !== null && origen !== id,
    activo: origen !== null,
  };
}
