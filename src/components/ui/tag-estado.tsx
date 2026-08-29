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
      // Ancho fijo y no ajustado al texto: apiladas en una columna, cuatro
      // pastillas de anchos distintos se leen como un borde dentado y obligan a
      // medir cada una para compararlas. Con el mismo ancho, lo único que
      // cambia entre filas es el color, que es la información.
      //
      // w-32 lo fija la más larga, "No ejecutada"; el resto queda centrado.
      className={`inline-flex w-32 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold leading-none ${className}`}
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
