"use client";

import { createContext, useContext } from "react";

// Si el proyecto admite cambios, para todo el tablero.
//
// Va por contexto y no por prop encadenada por un motivo concreto: los
// controles editables del Follow Up están repartidos en cuatro niveles —el
// tablero, la card de cada lista, la fila de cada tarea, y dentro de la fila
// las celdas, el selector de personas y el menú de acciones— y encadenar el
// dato hasta cada hoja significa acordarse en todas. Con el contexto, un
// control que no lo lea es un control que se ve, y el que lo lea queda cubierto
// aunque después se mueva de lugar.
//
// No reemplaza al guard del servidor: es la mitad visible de la misma regla.
const Ctx = createContext(false);

export function SoloLecturaProvider({
  valor,
  children,
}: {
  valor: boolean;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSoloLectura(): boolean {
  return useContext(Ctx);
}
