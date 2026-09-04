"use client";

import { useState } from "react";

// Cuánto tarda el indicador en irse. Corto a propósito: es el acuse de recibo
// del clic, no una animación para mirar.
const MS_SALIDA = 150;

// El contador compacto que aparece al lado del mes cuando un filtro está
// puesto: ícono y número, nada más.
//
// Si no hay filtro parcial no se dibuja, y esa ausencia es la que dice
// "todos": no hace falta escribirlo. Antes cada pantalla mostraba una pastilla
// del tipo "Filtros activos → Todos los proyectos", que ocupaba media barra
// para decir, casi siempre, que no había ningún filtro puesto.
//
// Además es el atajo para sacarlo. Es el único elemento en pantalla que existe
// PORQUE hay un filtro puesto, así que es donde se va a buscar cómo sacarlo;
// obligar a volver al menú ⋮, abrirlo, marcar las que faltan y cerrarlo eran
// cuatro gestos para deshacer uno. Sin cruz ni nada agregado: el ícono y el
// número siguen siendo un dato, y lo que hace el clic se descubre al usarlo una
// vez. Agregarle iconografía lo convertía en un botón de cerrar y le quitaba lo
// que venía a decir. La acción sí se anuncia por aria-label, que es donde un
// lector de pantalla la necesita.
export function IndicadorFiltro({
  nombre,
  icono,
  seleccionados,
  total,
  onLimpiar,
  deshabilitado = false,
}: {
  // En plural y en minúscula: entra en "3 de 12 proyectos".
  nombre: string;
  icono: React.ReactNode;
  seleccionados: number;
  total: number;
  onLimpiar: () => void;
  deshabilitado?: boolean;
}) {
  // El indicador se va apenas se lo toca, sin esperar a que vuelva el servidor.
  // Son dos etapas: `saliendo` lo desvanece y `oculto` lo desmonta cuando
  // terminó. La segunda hace falta porque la primera no libera el lugar: con
  // opacity el hueco quedaba abierto hasta que llegaban los datos nuevos, que
  // es justo lo que se venía a sacar.
  //
  // El desmontaje va por setTimeout y no por transitionend ni por
  // requestAnimationFrame: en una pestaña de fondo esos dos no corren, y el
  // indicador quedaría invisible pero ocupando lugar hasta que alguien mire.
  //
  // El ancho no se anima. Se probaron las dos formas de hacerlo -una grilla de
  // 1fr a 0fr y un max-width que se cierra- y ninguna colapsa: como el
  // indicador es un item de un flex, su ancho lo sigue midiendo el contenido.
  // Medido en el navegador, a los 60ms de tocarlo la barra seguía igual de
  // ancha en las dos. El desmontaje sí libera el lugar, y con el fade delante
  // el salto queda tapado.
  const [saliendo, setSaliendo] = useState(false);
  const [oculto, setOculto] = useState(false);

  // Si vuelve un filtro distinto -otro mes, otra selección- el indicador tiene
  // que estar visible de nuevo. Se sincroniza en el render y no desde un
  // efecto, que dibujaría la pantalla dos veces. Sin esto, una navegación que
  // no llegara a limpiar dejaba el indicador invisible pero presente.
  const marca = `${seleccionados}/${total}`;
  const [previo, setPrevio] = useState(marca);
  if (marca !== previo) {
    setPrevio(marca);
    setSaliendo(false);
    setOculto(false);
  }

  // Solo se cuenta cuando la selección es PARCIAL: "todos" y "ninguno" no son
  // un filtro que valga la pena anunciar.
  if (seleccionados === 0 || seleccionados >= total || oculto) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setSaliendo(true);
        setTimeout(() => setOculto(true), MS_SALIDA);
        // La navegación sale en el mismo gesto, no después de la animación: el
        // header se reacomoda mientras los datos viajan, y cada bloque muestra
        // su propio spinner por su cuenta.
        onLimpiar();
      }}
      disabled={deshabilitado}
      data-tooltip={`${seleccionados} de ${total} ${nombre}`}
      aria-label={`Filtrando ${seleccionados} de ${total} ${nombre}. Quitar el filtro.`}
      className={`flex items-center gap-1 whitespace-nowrap rounded-full bg-dc-peri/15 px-2 py-1 text-xs tabular-nums text-dc-peri transition duration-150 hover:bg-dc-peri/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 ${
        saliendo
          ? "pointer-events-none scale-90 opacity-0"
          : "opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
      }`}
    >
      {icono}
      {seleccionados}
    </button>
  );
}
