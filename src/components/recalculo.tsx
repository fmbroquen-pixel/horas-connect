"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ZonaCargable } from "@/components/ui/zona-cargable";

// Estado compartido de "estoy recalculando" entre el selector de período y los
// bloques que dependen de él. Lo usan el Home, Time Tracking, Expenses y
// Analytics.
//
// Estas pantallas son Server Components: cambiar de mes es navegar a la misma
// ruta con otra query, y las tablas, los KPIs y los gráficos se vuelven a
// renderizar en el servidor. Ese viaje tarda, y sin ninguna señal la pantalla
// se queda con los datos viejos como si no hubiera pasado nada.
//
// La navegación va dentro de un useTransition: React mantiene `isPending` en
// true hasta que llega el HTML nuevo. Deliberadamente NO se atenúa la pantalla
// entera: el título y el propio selector siguen nítidos, así lo que se apaga es
// exactamente lo que se está recculculando.

// Cuánto dura como mínimo la señal, aunque el servidor conteste antes.
//
// Sin esto, una consulta rápida hace parpadear el spinner uno o dos frames —o
// ninguno— y el cambio de mes se siente como que no pasó nada: los números
// cambian solos y no queda claro que fue por lo que uno acababa de tocar. El
// piso no está para disimular lentitud, está para que la relación entre el clic
// y el cambio se pueda ver.
const MINIMO_MS = 400;

type Recalculo = { recalculando: boolean; navegar: (url: string) => void };

const RecalculoCtx = createContext<Recalculo>({
  recalculando: false,
  navegar: () => {},
});

export function RecalculoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  // Separado de `pendiente` porque vive más que él: arranca en el clic y se
  // apaga recién cuando además se cumplió el mínimo.
  const [recalculando, setRecalculando] = useState(false);
  const arranque = useRef(0);

  const navegar = (url: string) => {
    arranque.current = Date.now();
    setRecalculando(true);
    start(() => router.push(url));
  };

  useEffect(() => {
    if (pendiente || !recalculando) return;
    const restante = MINIMO_MS - (Date.now() - arranque.current);
    if (restante <= 0) {
      setRecalculando(false);
      return;
    }
    // setTimeout y no requestAnimationFrame: en una pestaña en segundo plano no
    // se emiten frames, y el spinner se quedaría prendido para siempre.
    const t = setTimeout(() => setRecalculando(false), restante);
    return () => clearTimeout(t);
  }, [pendiente, recalculando]);

  return (
    <RecalculoCtx.Provider value={{ recalculando, navegar }}>
      {children}
    </RecalculoCtx.Provider>
  );
}

export function useRecalculo() {
  return useContext(RecalculoCtx);
}

// Envuelve una zona cuyo contenido depende del período. Sus children pueden ser
// Server Components: acá solo se les pone una capa de opacidad alrededor.
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

// Un bloque que se recalcula al cambiar de período: muestra su spinner y
// conserva su caja para que no salte el layout. Es el puente entre el contexto
// (cliente) y las cards y tablas, que se arman en el Server Component.
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
