// La columna de acciones de una fila, con lugares fijos.
//
// Son tres posiciones: una para la señal que aparece y desaparece —la marca de
// edición, y mañana lo que sea— y dos para editar y eliminar. La primera
// reserva su ancho aunque esté vacía.
//
// Sin eso, la marca empujaba a los botones: en una tabla, dos filas seguidas
// tenían Editar en columnas distintas según si el registro se había editado o
// no, y el ojo pierde el carril. Reservar 20px siempre cuesta menos que eso.
export function CarrilAcciones({
  temporal,
  children,
}: {
  // La señal que puede o no estar. Su espacio se reserva igual.
  temporal?: React.ReactNode;
  // Editar y eliminar, en ese orden.
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center justify-center gap-1">
      <span className="flex w-5 shrink-0 justify-center">{temporal}</span>
      {children}
    </span>
  );
}
