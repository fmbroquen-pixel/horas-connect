import { prisma } from "@/lib/prisma";
import type { Usuario } from "@/generated/prisma/client";

// Roles que pueden tener horas asociadas. El "reader" es de solo lectura y
// no reporta, así que nunca aparece como destino de una carga.
const ROLES_QUE_REPORTAN = ["guest", "admin"] as const;

// Usuarios elegibles en el selector "Registrar horas para" (solo lo ve un
// admin): activos y con un rol que reporte horas.
export async function getUsuariosQueReportan(): Promise<Usuario[]> {
  return prisma.usuario.findMany({
    where: { activo: true, rol: { in: [...ROLES_QUE_REPORTAN] } },
    orderBy: { nombre: "asc" },
  });
}

// Discriminante explícito (`ok`) en vez de mirar si `error` viene cargado:
// así TypeScript estrecha el tipo de forma confiable en cada llamador.
export type ResultadoDestino =
  | { ok: true; destino: Usuario }
  | { ok: false; error: string };

// Resuelve a quién pertenece lo que se está cargando —las horas trabajadas o
// el gasto— a partir de lo que pide el formulario o la URL. Es el único punto
// donde se decide, y siempre corre en el servidor: un usuario que no sea
// admin queda atado a sí mismo aunque manipule el form o el query param.
// Quien ejecuta la acción se guarda por separado en cada action.
export async function resolverUsuarioDestino(
  actor: Usuario,
  usuarioIdSolicitado?: string | null,
  // Solo cambia el texto del error: "horas" en Time Tracking, "viáticos" en
  // Expenses. La regla de permisos es la misma para los dos.
  queSeCarga = "horas",
): Promise<ResultadoDestino> {
  // Sin pedido explícito, o pidiéndose a sí mismo: siempre permitido.
  if (!usuarioIdSolicitado || usuarioIdSolicitado === actor.id) {
    return { ok: true, destino: actor };
  }

  if (actor.rol !== "admin") {
    return {
      ok: false,
      error: `No podés registrar ${queSeCarga} en nombre de otra persona.`,
    };
  }

  const destino = await prisma.usuario.findFirst({
    where: {
      id: usuarioIdSolicitado,
      activo: true,
      rol: { in: [...ROLES_QUE_REPORTAN] },
    },
  });
  if (!destino) {
    return {
      ok: false,
      error: `El usuario elegido no existe o no puede reportar ${queSeCarga}.`,
    };
  }
  return { ok: true, destino };
}
