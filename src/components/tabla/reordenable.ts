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
//
// El destino se expresa como POSICIÓN (0..n), no como "el ítem sobre el que
// solté". Insertar siempre antes del ítem apuntado deja posiciones
// inalcanzables: arrastrando hacia abajo nunca se puede pasar al ítem de
// destino, así que la última posición directamente no existía y había que
// mover otra cosa en sentido contrario para llegar. Con posiciones, cualquier
// ítem llega a cualquier lugar en un solo gesto.
//
// Cuál posición depende de en qué mitad del ítem está el cursor: mitad de
// arriba = antes, mitad de abajo = después. Eso es lo que hace que la línea
// indicadora coincida con lo que va a pasar al soltar.
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
  // La línea va justo ARRIBA de este ítem.
  marcaAntes: (id: string) => boolean;
  // La línea va DEBAJO de este ítem. Solo da true en el último: cualquier
  // otro borde ya lo dibuja el marcaAntes del ítem siguiente, y pintarlo dos
  // veces mostraría dos líneas para la misma posición.
  marcaDespues: (id: string) => boolean;
  activo: boolean;
  // Orden a dibujar: el optimista mientras el servidor confirma, o el del
  // servidor. El llamador ordena sus ítems por esto.
  orden: string[];
};

// Mueve `desde` a la posición `indiceDestino`, expresada sobre la lista tal
// como está ANTES de sacar el elemento. Devuelve null si no hay cambio real.
// Aparte del hook para poder probarla.
export function moverAIndice(
  ids: string[],
  desde: string,
  indiceDestino: number,
): string[] | null {
  const i = ids.indexOf(desde);
  if (i < 0) return null;

  // Al sacar el elemento, todas las posiciones que estaban después suyo se
  // corren una hacia atrás. Sin este ajuste, arrastrar hacia abajo caería
  // siempre un lugar antes de donde muestra la línea.
  const destino = indiceDestino > i ? indiceDestino - 1 : indiceDestino;
  if (destino === i) return null;

  const orden = ids.filter((x) => x !== desde);
  orden.splice(Math.max(0, Math.min(destino, orden.length)), 0, desde);
  return orden.join() === ids.join() ? null : orden;
}

export function useReordenable(
  ids: string[],
  // Recibe el orden final y CUÁL se movió: quien reordena suele necesitar
  // distinguir la causa del cambio de sus consecuencias.
  onReordenar: (idsEnOrden: string[], movidoId: string) => void,
): Reordenable {
  const [origen, setOrigen] = useState<string | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
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

  const limpiar = () => {
    setOrigen(null);
    setDestino(null);
  };

  const soltar = () => {
    const desde = origen;
    const indice = destino;
    limpiar();
    if (!desde || indice === null) return;

    // Solo se avisa si el orden cambió de verdad: soltar en el mismo lugar no
    // tiene por qué disparar una escritura ni un recálculo de fechas.
    const orden = moverAIndice(visibles, desde, indice);
    if (!orden) return;
    setOptimista(orden);
    onReordenar(orden, desde);
  };

  // Mitad de arriba del ítem → antes; mitad de abajo → después.
  const posicionSegunCursor = (e: React.DragEvent, id: string) => {
    const i = visibles.indexOf(id);
    if (i < 0) return null;
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? i : i + 1;
  };

  return {
    orden: visibles,
    agarre: (id) => ({
      draggable: true,
      onDragStart: (e) => {
        setOrigen(id);
        e.dataTransfer.effectAllowed = "move";
        // Firefox no arranca el arrastre sin datos asociados.
        e.dataTransfer.setData("text/plain", id);
      },
      onDragEnd: limpiar,
    }),
    zona: (id) => ({
      onDragOver: (e) => {
        if (!origen) return;
        // Sin preventDefault el navegador no considera esto un destino
        // válido y no dispara el drop.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const i = posicionSegunCursor(e, id);
        if (i !== null && i !== destino) setDestino(i);
      },
      onDrop: (e) => {
        e.preventDefault();
        soltar();
      },
    }),
    arrastrada: (id) => origen === id,
    marcaAntes: (id) => origen !== null && destino === visibles.indexOf(id),
    marcaDespues: (id) =>
      origen !== null &&
      visibles.indexOf(id) === visibles.length - 1 &&
      destino === visibles.length,
    activo: origen !== null,
  };
}
