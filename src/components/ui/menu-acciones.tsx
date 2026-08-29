"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// El menú "⋮" de una pantalla: un solo botón para todo lo que no es la tabla.
//
// Existe como componente compartido porque antes cada cosa traía su propio
// disparador —uno para acciones, otro para la papelera, otro para el filtro de
// proyectos— y la barra terminaba con tres botones de tres puntos seguidos,
// cada uno con su ancho y su hover.
//
// Los submenús se abren EN EL MISMO panel, no al costado: un panel flotante
// que abre otro panel flotante obliga a perseguirlo con el mouse, y en una
// barra pegada al borde derecho el segundo nivel se sale de la pantalla.
export const ITEM_MENU =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text focus:bg-dc-line/50 focus:text-dc-text focus:outline-none";

type Ctx = {
  vista: string | null;
  abrirSubmenu: (nombre: string) => void;
  volver: () => void;
  cerrar: () => void;
};

const MenuCtx = createContext<Ctx>({
  vista: null,
  abrirSubmenu: () => {},
  volver: () => {},
  cerrar: () => {},
});

export function useMenuAcciones() {
  return useContext(MenuCtx);
}

export function MenuAcciones({
  children,
  ancho = "w-52",
  etiqueta = "Más acciones",
}: {
  children: React.ReactNode;
  // El submenú de proyectos necesita más lugar que el de exportar.
  ancho?: string;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const cerrar = () => {
    setAbierto(false);
    setVista(null);
  };

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    const alTeclado = (e: KeyboardEvent) => {
      // Escape sale del submenú primero y del menú después: es el orden en el
      // que se entró.
      if (e.key !== "Escape") return;
      if (vista) setVista(null);
      else cerrar();
    };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
    };
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        data-tooltip={etiqueta}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex items-center rounded-lg border border-dc-line p-1.5 text-dc-muted transition hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text focus:border-dc-peri focus:text-dc-text focus:outline-none"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className={`dc-menu dc-pop-in absolute right-0 top-full z-40 mt-2 ${ancho} rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]`}
        >
          <MenuCtx.Provider
            value={{
              vista,
              abrirSubmenu: setVista,
              volver: () => setVista(null),
              cerrar,
            }}
          >
            {children}
          </MenuCtx.Provider>
        </div>
      )}
    </div>
  );
}

// Una acción suelta. Se cierra el menú al elegirla, salvo que se pida lo
// contrario (lo que abre un modal cierra; lo que navega también).
export function ItemMenu({
  onClick,
  icono,
  children,
}: {
  onClick: () => void;
  icono?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { vista, cerrar } = useMenuAcciones();
  if (vista) return null;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick();
        cerrar();
      }}
      className={ITEM_MENU}
    >
      {icono}
      {children}
    </button>
  );
}

// Un submenú: en la lista se ve como una fila con flecha, y al elegirla
// reemplaza el contenido del panel.
export function SubmenuMenu({
  nombre,
  icono,
  children,
}: {
  nombre: string;
  icono?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { vista, abrirSubmenu, volver } = useMenuAcciones();

  if (vista === nombre) {
    return (
      <>
        <button type="button" onClick={volver} className={`${ITEM_MENU} text-xs`}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Volver
        </button>
        {children}
      </>
    );
  }
  if (vista) return null;

  return (
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      onClick={() => abrirSubmenu(nombre)}
      className={`${ITEM_MENU} justify-between`}
    >
      <span className="flex items-center gap-2.5">
        {icono}
        {nombre}
      </span>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export function SeparadorMenu() {
  const { vista } = useMenuAcciones();
  if (vista) return null;
  return <div className="my-1 h-px bg-dc-line" />;
}
