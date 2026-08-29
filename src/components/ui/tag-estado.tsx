import { COLOR_ESTADO, ETIQUETA_ESTADO } from "@/app/(app)/proyectos/[id]/follow-up/constantes";

// El estado de una tarea o de una lista, como pastilla.
//
// Antes era un punto de color más el texto en gris: el punto llevaba toda la
// información y a 8px de diámetro había que buscarlo. Ahora el color ocupa la
// pastilla entera —fondo, borde y texto—, así que el estado se lee de un
// vistazo y sin comparar puntitos entre filas.
//
// El fondo y el borde salen del mismo color con alfa en vez de estar en un mapa
// aparte: así no hay forma de que un estado quede con un punto de un color y un
// fondo de otro.
export function TagEstado({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const color = COLOR_ESTADO[estado] ?? COLOR_ESTADO.sin_iniciar;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs leading-none ${className}`}
      style={{
        // 12% de fondo y 45% de borde: alcanza para separar la pastilla del
        // fondo oscuro sin que el color compita con el texto que lleva adentro.
        backgroundColor: `${color}1f`,
        borderColor: `${color}73`,
        color,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{ETIQUETA_ESTADO[estado] ?? estado}</span>
    </span>
  );
}
