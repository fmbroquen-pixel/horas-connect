// Las reglas de "qué puede ver quién", separadas de la base.
//
// Están acá y no dentro de las funciones que consultan Prisma por un motivo
// concreto: son la parte del código donde un error cuesta caro —de un lado se
// esconde trabajo real, del otro se filtra información de proyectos ajenos— y
// mezcladas con las consultas no se podían probar sin una base de datos.
// Separadas, se prueban con objetos sueltos y en milisegundos.
//
// Acá no hay ningún acceso a datos: entra lo que la base ya devolvió y sale la
// decisión.

import { apareceEnPeriodo } from "@/lib/vigencia-cliente";

export type ClienteVisible = {
  id: string;
  nombre: string;
  activo: boolean;
  // Desde cuándo dejó de operar. Solo hace falta para las lecturas históricas,
  // así que es opcional: las pantallas que no preguntan por un período no
  // necesitan traerlo.
  inactivadoEn?: Date | null;
};

export type Asignacion<C extends ClienteVisible> = {
  cliente: C;
  // Owner o Backup. Null = asignado para cargar horas, sin responsabilidad
  // declarada sobre el proyecto.
  rol: string | null;
};

export type AlcanceClientes = {
  // true = proyectos activos (el default), false = la sección Inactivos.
  activo?: boolean;
  // Solo las asignaciones con rol declarado. Es el alcance del Home de CORE:
  // ahí la pregunta no es "dónde puedo cargar horas" sino "de qué proyectos
  // soy responsable".
  soloConRol?: boolean;
  // Lectura histórica de un período que arranca en esta fecha (ISO). Cambia la
  // pregunta: en vez de "quién está activo" es "quién operaba en ese período",
  // así que además de los activos entran los inactivados después.
  //
  // Sin esto, apagar un cliente le borraba de la vista sus horas, sus viáticos
  // y su rentabilidad de meses anteriores: los datos seguían en la base y
  // ninguna pantalla los alcanzaba.
  historicoDesde?: string;
};

// Qué clientes ve un usuario.
//
//   · admin → todos los del estado pedido, tenga o no asignaciones. Administra
//     el portafolio completo; ponerlo como Owner de un proyecto no puede
//     achicarle la vista al resto.
//   · resto → exactamente los que le asignaron. SIN ASIGNACIONES LA LISTA ES
//     VACÍA: un permiso no se amplía por ausencia de datos. Esto ya falló una
//     vez —sin asignaciones se veían todos los proyectos— y es la razón de que
//     exista este archivo.
export function clientesVisibles<C extends ClienteVisible>(
  rol: string,
  todos: C[],
  asignaciones: Asignacion<C>[],
  { activo = true, soloConRol = false, historicoDesde }: AlcanceClientes = {},
): C[] {
  const propios =
    rol === "admin"
      ? todos
      : asignaciones
          .filter((a) => !soloConRol || a.rol !== null)
          .map((a) => a.cliente);

  return propios
    .filter((c) =>
      historicoDesde
        ? apareceEnPeriodo(
            { activo: c.activo, inactivadoEn: c.inactivadoEn ?? null },
            historicoDesde,
          )
        : c.activo === activo,
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ¿Puede entrar a la pantalla de un proyecto puntual?
//
// El reader queda afuera aunque tenga asignaciones: su vista es Analytics, no
// el proyecto. Un rol desconocido tampoco entra: lo que no está permitido
// explícitamente, no se permite.
export function puedeVerProyecto(rol: string, estaAsignado: boolean): boolean {
  if (rol === "admin") return true;
  if (rol === "guest") return estaAsignado;
  return false;
}
