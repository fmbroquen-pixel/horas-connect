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
// Cuál posición depende de la DIRECCIÓN del arrastre: si venís subiendo, el
// ítem apuntado se corre hacia abajo y el tuyo queda antes; si venís bajando,
// queda después. No por mitades: con mitades, apuntar a la mitad "equivocada"
// del vecino inmediato calcula la posición que el ítem ya ocupa y no pasa
// nada. Esa zona muerta es la mitad de la superficie del vecino, y con dos
// ítems es justo donde cae el cursor al arrastrar uno sobre el otro.
//
// Con dirección, cualquier lugar del ítem apuntado produce un movimiento
// real, y la línea indicadora aparece del lado por el que venís.
// La imagen que sigue al cursor mientras se arrastra.
//
// Por defecto el navegador usa como fantasma el elemento del que se agarró —la
// celda del checkbox— y lo que se veía moverse era un cuadradito suelto, sin
// relación con la fila que en realidad se estaba moviendo. Acá se le pasa una
// copia de la FILA entera.
//
// Se usa setDragImage y no un div siguiendo al mouse: el navegador ya mueve
// esa imagen con el cursor, a 60fps y fuera del hilo de JavaScript. Un
// seguidor propio sería una segunda implementación del arrastre, con su
// listener de mousemove y sus saltos, para llegar a lo mismo.
function prepararFantasma(e: React.DragEvent) {
  const fila = (e.currentTarget as HTMLElement).closest<HTMLElement>(
    "[data-fila-arrastrable]",
  );
  if (!fila) return;

  const rect = fila.getBoundingClientRect();
  const copia = fila.cloneNode(true) as HTMLElement;

  // Ancho fijo: la copia sale del flujo y sin esto colapsaría al ancho de su
  // contenido, que es justo lo que la haría dejar de parecerse a la fila.
  copia.style.width = `${rect.width}px`;
  copia.style.height = `${rect.height}px`;
  copia.style.opacity = "0.85";
  copia.style.borderRadius = "0.75rem";
  copia.style.background = "var(--dc-card)";
  copia.style.boxShadow =
    "0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px var(--color-dc-peri)";
  copia.style.pointerEvents = "none";
  // Fuera de la pantalla: el navegador la fotografía igual, y si estuviera a la
  // vista se vería un instante antes de que arranque el arrastre.
  copia.style.position = "fixed";
  copia.style.top = "-10000px";
  copia.style.left = "-10000px";
  document.body.appendChild(copia);

  // El agarre queda bajo el cursor en el mismo punto donde se apoyó: sin esto
  // la fila salta a la esquina superior izquierda del puntero al empezar.
  e.dataTransfer.setDragImage(
    copia,
    e.clientX - rect.left,
    e.clientY - rect.top,
  );

  // El navegador toma la foto de forma sincrónica al terminar dragstart, así
  // que para el próximo tick la copia ya no hace falta.
  setTimeout(() => copia.remove(), 0);
}

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
  // Zona para el borde de ARRIBA de todo. Apunta a una posición fija en vez de
  // a un ítem, porque ahí no hay ítem anterior al que apuntar.
  //
  // Hace falta una zona propia y no alcanza con dejar un hueco: un hueco es
  // espacio del contenedor, no de ningún ítem, y soltar sobre espacio suelto
  // no dispara ningún drop. La línea se dibujaba igual —la había pintado un
  // dragover anterior— y el gesto terminaba en nada.
  zonaAntesDeTodo: () => {
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  // Para el feedback visual.
  arrastrada: (id: string) => boolean;
  // La línea va justo ARRIBA de este ítem.
  marcaAntes: (id: string) => boolean;
  // La línea va DEBAJO de este ítem. Nunca dan las dos a la vez ni en dos
  // ítems distintos: se dibujan solo sobre el que está apuntado.
  marcaDespues: (id: string) => boolean;
  activo: boolean;
  // Orden a dibujar: el optimista mientras el servidor confirma, o el del
  // servidor. El llamador ordena sus ítems por esto.
  orden: string[];
};

// Posición de destino según a qué ítem apuntás y desde dónde venís. Apuntar
// al propio ítem arrastrado devuelve su lugar actual, que no mueve nada.
// Aparte del hook para poder probarla.
export function indiceSegunDireccion(
  indiceApuntado: number,
  indiceOrigen: number,
): number {
  return indiceApuntado < indiceOrigen ? indiceApuntado : indiceApuntado + 1;
}

// De qué lado del ítem apuntado va la línea indicadora. Aparte del hook para
// poder probar lo que importa de verdad: que la línea marque el mismo borde
// donde el ítem va a terminar cayendo.
export function ladoDeMarca(
  indiceDestino: number,
  indiceApuntado: number,
): "antes" | "despues" | null {
  if (indiceDestino === indiceApuntado) return "antes";
  if (indiceDestino === indiceApuntado + 1) return "despues";
  return null;
}

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
  // Sobre qué ítem está el cursor: las líneas se dibujan solo ahí, así nunca
  // aparecen dos para el mismo borde.
  const [apuntado, setApuntado] = useState<string | null>(null);
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
    setApuntado(null);
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

  const posicionDe = (id: string) => {
    const i = visibles.indexOf(id);
    const desde = origen ? visibles.indexOf(origen) : -1;
    if (i < 0 || desde < 0) return null;
    return indiceSegunDireccion(i, desde);
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
        prepararFantasma(e);
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
        const i = posicionDe(id);
        if (i === null) return;
        if (i !== destino) setDestino(i);
        if (apuntado !== id) setApuntado(id);
      },
      onDrop: (e) => {
        e.preventDefault();
        soltar();
      },
    }),
    zonaAntesDeTodo: () => ({
      onDragOver: (e) => {
        if (!origen) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        // Posición 0 fija. La marca se le pide al primer ítem para que la
        // línea salga en el mismo lugar y con el mismo dibujo que siempre.
        if (destino !== 0) setDestino(0);
        const primero = visibles[0];
        if (primero && apuntado !== primero) setApuntado(primero);
      },
      onDrop: (e) => {
        e.preventDefault();
        soltar();
      },
    }),
    arrastrada: (id) => origen === id,
    marcaAntes: (id) =>
      apuntado === id &&
      destino !== null &&
      ladoDeMarca(destino, visibles.indexOf(id)) === "antes",
    marcaDespues: (id) =>
      apuntado === id &&
      destino !== null &&
      ladoDeMarca(destino, visibles.indexOf(id)) === "despues",
    activo: origen !== null,
  };
}
