"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// Cuánto dura el realce después de reprogramar. Coincide con la animación
// dc-recalculo de globals.css.
const DURACION_MS = 1300;

export type Resaltado = "movida" | "recalculada" | null;

type Contexto = {
  // Qué realce le toca a una tarea, si es que le toca alguno.
  resaltadoDe: (tareaId: string) => Resaltado;
  // Lo llama quien acaba de mover algo: la tarea (o lista) que se movió y los
  // ids que el servidor reprogramó por dependencia.
  marcarReprogramacion: (movidoIds: string[], recalculadas: string[]) => void;
};

const Ctx = createContext<Contexto>({
  resaltadoDe: () => null,
  marcarReprogramacion: () => {},
});

// Reparte el realce por el árbol del tablero.
//
// Va por contexto y no por props porque quien mueve (el tablero, o una lista)
// y quien pinta (la celda de fecha, tres niveles más abajo) están lejos, y
// sobre todo porque mover UNA lista reprograma tareas de OTRAS: el conjunto
// afectado no respeta la jerarquía de componentes.
export function ResaltadoProvider({ children }: { children: React.ReactNode }) {
  const [movidas, setMovidas] = useState<Set<string>>(new Set());
  const [recalculadas, setRecalculadas] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcarReprogramacion = useCallback(
    (movidoIds: string[], ids: string[]) => {
      if (timer.current) clearTimeout(timer.current);
      const movidasSet = new Set(movidoIds);
      setMovidas(movidasSet);
      // Una tarea no puede llevar los dos realces: si se movió, ese gana.
      setRecalculadas(new Set(ids.filter((id) => !movidasSet.has(id))));
      timer.current = setTimeout(() => {
        setMovidas(new Set());
        setRecalculadas(new Set());
      }, DURACION_MS);
    },
    [],
  );

  const resaltadoDe = useCallback(
    (tareaId: string): Resaltado =>
      movidas.has(tareaId)
        ? "movida"
        : recalculadas.has(tareaId)
          ? "recalculada"
          : null,
    [movidas, recalculadas],
  );

  return (
    <Ctx.Provider value={{ resaltadoDe, marcarReprogramacion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useResaltado() {
  return useContext(Ctx);
}

// Clase de la animación según el realce. La tarea que se movió es la causa
// del cambio y va más fuerte; las que se recalcularon por dependencia, más
// tenue.
export function claseResaltado(r: Resaltado): string {
  if (r === "movida") return "dc-recalculo";
  if (r === "recalculada") return "dc-recalculo-suave";
  return "";
}
