"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ZonaCargable } from "@/components/ui/zona-cargable";

// Estado compartido de "estoy recalculando" entre el filtro y los bloques que
// dependen de él.
//
// El Home es un Server Component: aplicar un filtro es navegar a la misma
// ruta con otra query, y los KPIs, las cards y los gráficos se vuelven a
// renderizar en el servidor. Ese viaje tarda, y sin ninguna señal la pantalla
// se queda con los números viejos como si nada estuviera pasando.
//
// La navegación va dentro de un useTransition: React mantiene `isPending` en
// true hasta que llega el HTML nuevo. El filtro dispara y los bloques
// afectados se atenúan mientras dura. Deliberadamente NO se atenúa la
// pantalla entera: el título y el propio filtro siguen nítidos, así lo que se
// apaga es exactamente lo que se está recalculando.
type Recalculo = { recalculando: boolean; navegar: (url: string) => void };

const RecalculoCtx = createContext<Recalculo>({
  recalculando: false,
  navegar: () => {},
});

export function RecalculoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [recalculando, start] = useTransition();
  const navegar = (url: string) => start(() => router.push(url));

  return (
    <RecalculoCtx.Provider value={{ recalculando, navegar }}>
      {children}
    </RecalculoCtx.Provider>
  );
}

export function useRecalculo() {
  return useContext(RecalculoCtx);
}

// Envuelve un bloque cuyo contenido depende del filtro. Sus children pueden
// ser Server Components: acá solo se les pone una capa de opacidad alrededor.
export function ZonaRecalculable({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { recalculando } = useRecalculo();

  return (
    <div
      // aria-busy además de la opacidad: para un lector de pantalla el cambio
      // de color no existe.
      aria-busy={recalculando}
      className={`${className} transition-opacity duration-300 ease-out ${
        recalculando ? "opacity-40" : "opacity-100"
      }`}
    >
      {children}
    </div>
  );
}

// Un bloque del Home que se recalcula con el filtro. Es el puente entre el
// contexto (cliente) y las cards, que se arman en el Server Component.
export function BloqueRecalculable({
  children,
  className,
  claseContenido,
}: {
  children: React.ReactNode;
  className?: string;
  claseContenido?: string;
}) {
  const { recalculando } = useRecalculo();
  return (
    <ZonaCargable
      cargando={recalculando}
      className={className}
      claseContenido={claseContenido}
    >
      {children}
    </ZonaCargable>
  );
}
