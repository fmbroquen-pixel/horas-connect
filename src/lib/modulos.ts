// Módulos que se pueden ocultar de la UI sin borrar su implementación.
//
// Poner un flag en `true` reactiva el módulo por completo: vuelve su entrada
// en la sidebar y su ruta deja de responder 404. No hace falta tocar nada
// más — el código, los componentes, las actions y las tablas de la base
// quedan intactos mientras está oculto.
//
// Los flags se tipan como `boolean` (y no con `as const`) a propósito: si
// TypeScript supiera que el valor es literalmente `false`, marcaría como
// inalcanzable todo el código que hay detrás del guard y ensuciaría el
// análisis del módulo que queremos preservar.
export const MODULOS: Record<"timeOff" | "cumpleanos", boolean> = {
  // Time Off (vacaciones): oculto a pedido, implementación preservada en
  // src/app/(app)/vacaciones/ y en el modelo Vacacion de Prisma.
  timeOff: false,

  // Card "Cumpleaños de la semana" del Home de CORE: oculta a pedido. El
  // cálculo y el markup siguen en dashboard/page.tsx detrás de este guard, y
  // los cumpleaños se siguen cargando en el Equipo de cada proyecto.
  cumpleanos: false,
};
