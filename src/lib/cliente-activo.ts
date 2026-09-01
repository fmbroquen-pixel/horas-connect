import { prisma } from "@/lib/prisma";

// El guard de escritura sobre clientes inactivos, en un solo lugar.
//
// La regla: un cliente inactivo no recibe ninguna carga de datos, ni futura ni
// pasada, y lo que ya tiene se mira pero no se edita. Vale para las horas, los
// viáticos, la facturación y todo lo del proyecto.
//
// Esta separado de lib/vigencia-cliente —que es puro y testeado— porque acá
// hace falta la base: quien escribe manda ids, no clientes.

// El nombre del primer cliente inactivo del conjunto, o null si están todos
// activos. Devuelve el NOMBRE y no un booleano porque el mensaje de error tiene
// que poder decir cuál: en una edición masiva sobre varias filas, "hay un
// cliente inactivo" no alcanza para saber qué sacar de la selección.
export async function clienteInactivoDe(
  clienteIds: string[],
): Promise<string | null> {
  const ids = [...new Set(clienteIds)].filter(Boolean);
  if (ids.length === 0) return null;
  const inactivo = await prisma.cliente.findFirst({
    where: { id: { in: ids }, activo: false },
    select: { nombre: true },
  });
  return inactivo?.nombre ?? null;
}

// El mensaje, uno solo para toda la app. Que el motivo se lea igual en Time
// Tracking, en Expenses y en Analytics es parte de que se entienda: si cada
// pantalla lo dijera distinto, parecerían tres reglas.
export function mensajeInactivo(nombre: string): string {
  return `"${nombre}" está inactivo: no admite cambios.`;
}
