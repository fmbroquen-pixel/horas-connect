"use client";

import { useEffect, useRef, useState } from "react";

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
// La card que se lleva el cursor mientras se arrastra.
//
// Antes esto era un setDragImage: una FOTO que saca el navegador y despues
// dibuja con su propia transparencia y sus propias reglas. Por mas solido que
// se pusiera el original, lo que se veia moverse era un calco desvaido, y no
// hay forma de pedirle otra cosa: el estilo de esa imagen no es nuestro.
//
// Asi que la imagen nativa se apaga -un pixel transparente- y en su lugar va un
// nodo de verdad, en el <body>, que se mueve con el cursor. Es la misma fila
// clonada, con fondo solido, esquinas redondeadas, la sombra de CORE y un
// pelin de escala: se lee como el objeto que se agarro, no como su fantasma.
//
// Es DOM imperativo a proposito. El arrastre emite eventos decenas de veces por
// segundo; pasarlos por estado de React seria rerenderizar la lista entera en
// cada uno para mover un solo nodo. Acá se toca el transform de ese nodo y
// nada mas, que es lo que el navegador puede componer sin tocar el layout.
//
// La logica de reordenamiento no se entera: sigue siendo el mismo dragstart,
// dragover y drop de siempre.

// Un pixel transparente para apagar la imagen nativa. Se crea una sola vez.
let pixelVacio: HTMLImageElement | null = null;
function imagenVacia(): HTMLImageElement {
  if (!pixelVacio) {
    pixelVacio = new Image();
    pixelVacio.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }
  return pixelVacio;
}

type Capa = { nodo: HTMLElement; offsetX: number; offsetY: number };

function crearCapa(e: React.DragEvent): Capa | null {
  const fila = (e.currentTarget as HTMLElement).closest<HTMLElement>(
    "[data-fila-arrastrable]",
  );
  if (!fila) return null;

  const rect = fila.getBoundingClientRect();
  const nodo = fila.cloneNode(true) as HTMLElement;

  // Ancho y alto fijos: el clon sale del flujo y sin esto colapsaria al ancho
  // de su contenido, que es justo lo que lo haria dejar de parecerse a la fila.
  nodo.style.width = `${rect.width}px`;
  nodo.style.height = `${rect.height}px`;
  nodo.style.position = "fixed";
  nodo.style.left = "0";
  nodo.style.top = "0";
  nodo.style.zIndex = "9999";
  // Sin esto la capa se comeria los dragover de lo que hay debajo y no se
  // podria elegir destino: el cursor estaria siempre sobre ella.
  nodo.style.pointerEvents = "none";
  nodo.style.borderRadius = "0.75rem";
  // La clase del panel viaja con el clon. Al colgarlo del <body> sale del
  // .dc-panel y pierde TODOS sus tokens -texto, bordes, acentos, superficie-,
  // que ahi adentro estan redefinidos en su version "sobre claro". Sin esto la
  // card quedaba con el fondo translucido del tema oscuro y el texto del panel
  // encima: ilegible, y ademas nada solido.
  nodo.classList.add("dc-panel");
  // Blanco, como las filas dentro del panel. `--dc-deeper` es blanco ahi
  // adentro, pero se pone literal: es una card suelta, no una fila, y su fondo
  // no deberia moverse si manana cambia el de las filas.
  nodo.style.background = "#ffffff";
  nodo.style.border = "none";
  nodo.style.boxShadow =
    "0 18px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--color-dc-peri), 0 0 22px rgba(139,140,255,0.35)";
  // 1.02: apenas despegada de la lista. Mas escala la desalinea de las filas y
  // deja de parecer la misma tarea.
  nodo.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.02)`;
  // Corta el jitter cuando el navegador espacia los eventos, sin que se sienta
  // que la card viene atrasada.
  nodo.style.transition = "transform 40ms linear";
  nodo.style.willChange = "transform";

  document.body.appendChild(nodo);
  return {
    nodo,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
}

function moverCapa(capa: Capa, x: number, y: number) {
  // Los eventos de arrastre llegan con 0,0 al final en algunos navegadores:
  // moverla ahi la mandaria a la esquina justo antes de desaparecer.
  if (x === 0 && y === 0) return;
  capa.nodo.style.transform = `translate3d(${x - capa.offsetX}px, ${y - capa.offsetY}px, 0) scale(1.02)`;
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

  // La card que sigue al cursor. En un ref y no en estado: se mueve decenas de
  // veces por segundo y no tiene que provocar un render.
  const capaRef = useRef<Capa | null>(null);
  const seguirRef = useRef<((e: DragEvent) => void) | null>(null);

  const soltarCapa = () => {
    if (seguirRef.current) {
      document.removeEventListener("dragover", seguirRef.current);
      document.removeEventListener("drag", seguirRef.current);
      seguirRef.current = null;
    }
    capaRef.current?.nodo.remove();
    capaRef.current = null;
  };

  // Cuando llega el orden del servidor, manda él: si coincide con lo que ya
  // se mostraba el usuario no ve ningún salto, y si el servidor rechazó el
  // movimiento la lista vuelve sola a la verdad.
  const [ultimoServidor, setUltimoServidor] = useState(ids);
  if (ids.join() !== ultimoServidor.join()) {
    setUltimoServidor(ids);
    setOptimista(null);
  }

  const visibles = optimista ?? ids;

  // Si el componente se va en medio de un arrastre -una navegación, una
  // revalidación que reemplaza la lista- la card quedaría pegada a la pantalla
  // sin nadie que la saque.
  useEffect(() => soltarCapa, []);

  const limpiar = () => {
    soltarCapa();
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
        // La imagen nativa se apaga y en su lugar va la card de verdad.
        e.dataTransfer.setDragImage(imagenVacia(), 0, 0);
        const capa = crearCapa(e);
        if (capa) {
          capaRef.current = capa;
          const seguir = (ev: DragEvent) => moverCapa(capa, ev.clientX, ev.clientY);
          seguirRef.current = seguir;
          // Los dos: `drag` lo emite el origen y `dragover` el elemento de
          // abajo. Con uno solo la card se queda quieta en los tramos donde ese
          // evento no llega -sobre un hueco, o fuera de una zona de destino-.
          document.addEventListener("dragover", seguir);
          document.addEventListener("drag", seguir);
        }
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
