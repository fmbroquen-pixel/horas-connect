import { prisma } from "@/lib/prisma";

// El guard de escritura sobre registros de usuarios bloqueados.
//
// La regla, la misma que rige para los clientes inactivos: un usuario dado de
// baja no recibe carga nueva, y lo que ya cargó se mira pero no se edita.
//
// Hace falta porque las dos mitades de la regla se implementaron en momentos
// distintos. Primero se hizo visible la historia de un usuario bloqueado -sin
// eso desaparecían registros reales de la tabla y el total no cuadraba contra
// Analytics- pero nada impedía editarla: un admin puede editar cualquier
// registro, y "cualquiera" incluía los de alguien que ya no está.
//
// Espejo de lib/cliente-activo, a propósito: son la misma regla aplicada a las
// dos dimensiones de un registro de horas, quién lo trabajó y para quién.

// El nombre del primer usuario bloqueado del conjunto, o null si están todos
// activos. Devuelve el NOMBRE y no un booleano por el mismo motivo que su
// hermano: en una edición masiva, "hay un usuario bloqueado" no alcanza para
// saber qué sacar de la selección.
export async function usuarioBloqueadoDe(
  usuarioIds: string[],
): Promise<string | null> {
  const ids = [...new Set(usuarioIds)].filter(Boolean);
  if (ids.length === 0) return null;
  const bloqueado = await prisma.usuario.findFirst({
    where: { id: { in: ids }, activo: false },
    select: { nombre: true },
  });
  return bloqueado?.nombre ?? null;
}

export function mensajeBloqueado(nombre: string): string {
  return `${nombre} está bloqueado: sus registros no admiten cambios.`;
}
