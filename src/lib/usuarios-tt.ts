import { prisma } from "@/lib/prisma";
import type { Usuario } from "@/generated/prisma/client";

// Quiénes aparecen en Time Tracking, y para quiénes se puede cargar.
//
// Reemplaza al viejo "modo destino", donde la pantalla entera se ponía en los
// zapatos de UN usuario elegido en un selector global. El dueño de las horas
// siempre fue una propiedad de cada registro (RegistroHoras.usuarioId); el
// selector era una forma de fijarlo para toda la sesión de carga, y de paso
// obligaba a mirar un mentor por vez.

// Los usuarios cuyas horas puede VER el actor.
//
// El admin ve a todos los que reportan; cualquier otro rol se ve solo a sí
// mismo.
//
// Incluye a los usuarios BLOQUEADOS, y es a propósito. Un usuario dado de baja
// deja de cargar horas, pero las que cargó siguen existiendo: son horas que se
// trabajaron, se facturaron y cuentan en los totales del mes. Dejarlos afuera
// hacía desaparecer registros reales de la tabla sin decir nada -en producción
// eran 4 registros, 7,05 horas- y descuadraba el total contra Analytics.
//
// Es el mismo criterio que con los clientes inactivos: la historia se mira, la
// carga nueva no. Para CARGAR está la lista que arma la página, que además
// exige tarifa y proyectos, y el servidor lo revalida en resolverUsuarioDestino
// (que sí exige activo).
export async function getUsuariosVisibles(actor: Usuario): Promise<Usuario[]> {
  if (actor.rol !== "admin") return [actor];
  return prisma.usuario.findMany({
    where: { rol: { in: ["guest", "admin"] } },
    orderBy: { nombre: "asc" },
  });
}

// A quiénes de esa lista hay que consultar, dado lo que pide la URL.
//
// Sin parámetro, todos los visibles. Con parámetro, solo los pedidos que
// además sean visibles: un id ajeno en la URL no abre nada. Mismo criterio que
// el filtro de proyectos, para que las dos cosas se lean igual.
export function idsUsuariosDelFiltro(
  visibles: { id: string }[],
  pedidos: string | undefined,
): string[] {
  const idsVisibles = visibles.map((u) => u.id);
  const lista = (pedidos ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lista.length === 0) return idsVisibles;
  const validos = lista.filter((id) => idsVisibles.includes(id));
  // Si lo pedido no deja nada válido, se muestran todos en vez de una tabla
  // vacía sin explicación: un filtro que no aplica no es un filtro.
  return validos.length > 0 ? validos : idsVisibles;
}

// Tarifas e historial de cada usuario visible, para poder valuar una fila en
// el navegador sin importar de quién sea. Antes alcanzaba con las del único
// destino; ahora la barra de carga cambia de dueño sin recargar la página.
export async function getTarifasPorUsuario(
  usuarioIds: string[],
): Promise<Record<string, Record<string, { valorUsd: number; vigenteDesde: Date; vigenteHasta: Date | null }[]>>> {
  if (usuarioIds.length === 0) return {};
  const tarifas = await prisma.tarifa.findMany({
    where: { usuarioId: { in: usuarioIds } },
  });
  const out: Record<
    string,
    Record<string, { valorUsd: number; vigenteDesde: Date; vigenteHasta: Date | null }[]>
  > = {};
  for (const t of tarifas) {
    const porUsuario = (out[t.usuarioId] ??= {});
    const clave = `${t.modalidad}-${t.ownership}`;
    (porUsuario[clave] ??= []).push({
      valorUsd: Number(t.valorUsd),
      vigenteDesde: t.vigenteDesde,
      vigenteHasta: t.vigenteHasta,
    });
  }
  return out;
}
