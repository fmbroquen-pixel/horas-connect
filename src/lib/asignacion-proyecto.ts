import { prisma } from "@/lib/prisma";
import { mensajeInactivo } from "@/lib/cliente-activo";
import { MAX_BACKUPS } from "@/app/(app)/admin/usuarios/constantes";

// Asignarle un proyecto a alguien sobre la marcha, para no rechazar una
// edición que un admin puede resolver en el momento.
//
// La usan Time Tracking y Expenses: en las dos, cambiar el dueño de un
// registro exige que el cliente sea suyo, y en las dos rechazar sin más
// obligaba a salir de la pantalla, ir a Settings, asignar y volver a buscar la
// fila. Vive en lib y no en una de las dos para que la pregunta y la regla del
// cupo sean literalmente la misma.

// Cuando la edición es válida salvo por ese permiso, el servidor no decide
// solo: devuelve la pregunta y no escribe nada. Mismo patrón que el conflicto
// de "En curso" en el Follow Up.
export type PreguntaAsignacion = {
  usuarioNombre: string;
  clienteNombre: string;
};

// Tres respuestas: ya lo tiene, hay que preguntar, o se acaba de asignar.
export async function asegurarAsignacion(
  duenio: { id: string; nombre: string },
  clienteId: string,
  asignar: boolean,
): Promise<{ ok: true } | { asignacion: PreguntaAsignacion } | { error: string }> {
  const yaLoTiene = await prisma.proyectoAsignado.findUnique({
    where: { usuarioId_clienteId: { usuarioId: duenio.id, clienteId } },
    select: { id: true },
  });
  if (yaLoTiene) return { ok: true };

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { nombre: true, activo: true },
  });
  if (!cliente) return { error: "Cliente inexistente." };
  // Un cliente inactivo no se asigna: no admite carga nueva de nadie, así que
  // ofrecer asignarlo sería ofrecer algo que después se rechaza igual.
  if (!cliente.activo) return { error: mensajeInactivo(cliente.nombre) };

  if (!asignar) {
    return {
      asignacion: { usuarioNombre: duenio.nombre, clienteNombre: cliente.nombre },
    };
  }

  // Entra como Backup, que es el rol que no desplaza a nadie: el Owner es uno
  // solo y ya tiene dueño.
  const backupsAjenos = await prisma.proyectoAsignado.count({
    where: { clienteId, rol: "backup", usuarioId: { not: duenio.id } },
  });
  if (backupsAjenos >= MAX_BACKUPS) {
    return {
      error: `"${cliente.nombre}" ya tiene ${MAX_BACKUPS} Mentores Backup. Liberá un lugar en Settings → Usuarios.`,
    };
  }
  await prisma.proyectoAsignado.create({
    data: { usuarioId: duenio.id, clienteId, rol: "backup" },
  });
  return { ok: true };
}
