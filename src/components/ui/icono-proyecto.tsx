// El ícono de proyecto, en un solo lugar.
//
// Lo usan la entrada "Proyectos" de la sidebar, el indicador de proyectos
// filtrados y el submenú "Proyectos" de Time Tracking y Expenses. Antes cada
// uno dibujaba el suyo: el filtro y el submenú una carpeta, y la sidebar un
// maletín. Que la misma cosa se viera de dos formas obligaba a traducir entre
// una y otra cada vez.
//
// El trazo se exporta aparte del <svg> porque la sidebar ya tiene su propio
// envoltorio, con su tamaño y su grosor: ahí hace falta el contenido, no el
// ícono entero.
export const TRAZO_PROYECTO = <path d="M3 7h6l2 2h10v10H3z" />;

export function IconoProyecto({
  size = 16,
  strokeWidth = 1.9,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {TRAZO_PROYECTO}
    </svg>
  );
}
