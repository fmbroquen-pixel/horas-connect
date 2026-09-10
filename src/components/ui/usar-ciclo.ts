"use client";

import { useState } from "react";

// El estado de un control que rota entre pocas opciones fijas.
//
// Está separado del botón a propósito: acá vive QUÉ opción está elegida y cómo
// se pasa a la siguiente; el botón solo dibuja. Así el mismo ciclo se puede
// mostrar de otra forma mañana, y el botón se puede usar con cualquier ciclo.
//
// Rota en círculo: después de la última vuelve la primera. Un control que rota
// no tiene tope, y toparse en el último valor obligaría a saber de antemano
// cuál era para no quedarse trabado ahí.
export function useCiclo<T extends string>(opciones: readonly T[], inicial?: T) {
  const [valor, setValor] = useState<T>(inicial ?? opciones[0]);

  const siguiente = () => {
    const i = opciones.indexOf(valor);
    // Si el valor actual no está en la lista -no debería pasar- se arranca de
    // nuevo desde la primera en vez de quedarse quieto.
    setValor(opciones[(i + 1) % opciones.length] ?? opciones[0]);
  };

  return { valor, siguiente, setValor };
}
