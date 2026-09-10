import { prisma } from "@/lib/prisma";
import type { ProyectoAsignable } from "@/app/(app)/admin/usuarios/constantes";

// Los datos del perfil de un usuario: tarifa, historial y proyectos
// asignables.
//
// Están acá y no en cada pantalla porque los mira DOS: Settings → Usuarios,
// donde un admin edita el perfil de alguien, y Mi perfil, donde cada uno ve el
// suyo. Las dos muestran lo mismo y solo cambia quién puede tocarlo, así que
// también tienen que traerlo igual: con dos consultas parecidas alcanza con
// que una filtre distinto para que el mismo usuario vea dos cosas.
//
// Quién puede EDITAR no se decide acá. Acá se decide qué existe.

// Guest y admin reportan horas, así que ambos necesitan tarifa (el admin
// también actúa como mentor). El reader no reporta horas.
export function tieneTarifa(rol: string): boolean {
  return rol === "guest" || rol === "admin";
}

export type PerfilUsuario = {
  vigentes: { modalidad: string; ownership: string; valorUsd: number }[];
  historial: {
    id: string;
    modalidad: string;
    ownership: string;
    valorUsd: number;
    vigenteDesde: Date;
    vigenteHasta: Date | null;
    creadoPor: string | null;
  }[];
  vigenteDesdeActual: string | null;
  proyectos: ProyectoAsignable[];
  // Los admins activos, para poder pedirles un cambio de tarifa desde la
  // pantalla de solo lectura.
  adminsEmails: string[];
};

export async function getPerfilUsuario(
  usuarioId: string,
  rol: string,
): Promise<PerfilUsuario> {
  const conTarifa = tieneTarifa(rol);

  const [tarifas, clientes, asignados, admins] = await Promise.all([
    conTarifa
      ? prisma.tarifa.findMany({
          where: { usuarioId },
          orderBy: { vigenteDesde: "desc" },
          include: { creadoPor: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
    // Todos los roles reciben proyectos asignados: guest y admin para limitar
    // dónde cargan horas; reader para acotar qué rentabilidad puede ver.
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    // Todas las asignaciones, de cualquier usuario: hacen falta para saber qué
    // proyectos ya tienen owner o los backups completos.
    prisma.proyectoAsignado.findMany({
      include: { usuario: { select: { nombre: true } } },
    }),
    prisma.usuario.findMany({
      where: { rol: "admin", activo: true },
      select: { email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  const vigentes = tarifas.filter((t) => t.vigenteHasta === null);

  return {
    vigentes: vigentes.map((t) => ({
      modalidad: t.modalidad,
      ownership: t.ownership,
      valorUsd: Number(t.valorUsd),
    })),
    historial: tarifas
      .filter((t) => t.vigenteHasta !== null)
      .map((t) => ({
        id: t.id,
        modalidad: t.modalidad,
        ownership: t.ownership,
        valorUsd: Number(t.valorUsd),
        vigenteDesde: t.vigenteDesde,
        vigenteHasta: t.vigenteHasta,
        creadoPor: t.creadoPor?.nombre ?? null,
      })),
    // Desde cuándo rige la tarifa cargada. Las cuatro combinaciones se guardan
    // juntas, así que alcanza con mirar la primera vigente que valga algo: las
    // de valor cero se crean aparte y no marcan el corte.
    vigenteDesdeActual:
      vigentes
        .find((v) => v.modalidad !== "valor_cero")
        ?.vigenteDesde.toISOString()
        .slice(0, 10) ?? null,
    proyectos: clientes.map((c) => {
      const delCliente = asignados.filter((a) => a.clienteId === c.id);
      const propia = delCliente.find((a) => a.usuarioId === usuarioId);
      const ajenas = delCliente.filter((a) => a.usuarioId !== usuarioId);
      return {
        id: c.id,
        nombre: c.nombre,
        rolPropio: propia?.rol ?? "",
        sinRol: Boolean(propia) && !propia?.rol,
        ownerAjeno: ajenas.find((a) => a.rol === "owner")?.usuario.nombre ?? null,
        backupsAjenos: ajenas
          .filter((a) => a.rol === "backup")
          .map((a) => a.usuario.nombre),
      };
    }),
    adminsEmails: admins.map((a) => a.email),
  };
}

// El valor vigente de una combinación, o undefined si no hay tarifa cargada.
export function valorVigente(
  vigentes: PerfilUsuario["vigentes"],
  modalidad: string,
  ownership: string,
): number | undefined {
  return vigentes.find((v) => v.modalidad === modalidad && v.ownership === ownership)
    ?.valorUsd;
}
