// El scope de filtros de un módulo, sin base de datos.
//
// Home CORE y Analytics filtran lo mismo -mes, proyectos y Mentor Owner- y
// hasta ahora cada pantalla resolvía su parte por su cuenta: el Home leía
// `params.proyectos` en su page.tsx y Analytics ni siquiera tenía filtro. Con
// esa forma, cada componente nuevo tenía que acordarse de aplicar los filtros,
// y el que se olvidaba mostraba números de otro recorte sin que nada avisara.
//
// Acá se deriva UNA lista de ids -`ids`, los proyectos que sobreviven a todos
// los filtros- y de esa lista comen los KPIs, las cards, las tablas y los
// gráficos. Un componente nuevo que reciba `scope.ids` hereda los filtros sin
// escribir una línea de lógica.
//
// Este archivo no consulta nada: entra lo que la base ya devolvió y sale la
// decisión, para poder probarlo sin levantar una base. Las consultas viven en
// lib/scope.

export type OpcionFiltro = { id: string; nombre: string };

// Un proyecto del alcance, con su Mentor Owner resuelto.
//
// El owner es el del PROYECTO, no el usuario que cargó horas: son dos
// preguntas distintas y Time Tracking ya responde la segunda con su filtro de
// usuarios.
export type ProyectoDelScope = {
  id: string;
  nombre: string;
  ownerId: string | null;
  ownerNombre: string | null;
};

// Los ids que vienen en la URL, quedándose solo con los que existen.
//
// Un id ajeno o viejo se descarta en silencio: la alternativa -romper, o
// mostrarlo vacío- deja al usuario con una pantalla rota por un link que
// alguien compartió hace dos meses.
export function parsearIds(
  param: string | undefined,
  validos: Iterable<string>,
): string[] {
  const set = new Set(validos);
  return (param ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => id !== "" && set.has(id));
}

// Los Mentor Owner de estos proyectos, sin repetir y ordenados por nombre.
//
// Solo los que efectivamente son owner de algo que el usuario alcanza: un
// filtro que ofrece gente sin proyectos en pantalla obliga a probar opciones
// para descubrir que no filtran nada.
export function ownersDe(proyectos: ProyectoDelScope[]): OpcionFiltro[] {
  const porId = new Map<string, string>();
  for (const p of proyectos) {
    if (p.ownerId && p.ownerNombre) porId.set(p.ownerId, p.ownerNombre);
  }
  return [...porId]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ¿Esta selección filtra algo?
//
// Ni "ninguno" ni "todos" son un filtro: las dos significan la vista completa.
// Es el mismo criterio con el que el parámetro viaja o no en la URL, y por eso
// está en una función y no repetido en cada lugar que lo pregunta.
export function filtraAlgo(seleccionados: string[], total: number): boolean {
  return seleccionados.length > 0 && seleccionados.length < total;
}

// Los proyectos que sobreviven a los dos filtros.
//
// Se combinan con Y: elegir dos proyectos y un owner deja los que están en las
// dos listas, no la suma. Es lo que espera quien acota dos veces -"de estos
// dos, el de Fulano"- y además hace que agregar un filtro nunca agrande el
// resultado.
export function idsFiltrados(
  proyectos: ProyectoDelScope[],
  proyectosSel: string[],
  ownersSel: string[],
): string[] {
  const porProyecto = filtraAlgo(proyectosSel, proyectos.length);
  const owners = ownersDe(proyectos);
  const porOwner = filtraAlgo(ownersSel, owners.length);

  const elegidos = new Set(proyectosSel);
  const duenios = new Set(ownersSel);

  return proyectos
    .filter((p) => {
      if (porProyecto && !elegidos.has(p.id)) return false;
      // Un proyecto sin Mentor Owner no pertenece a ninguno, así que ningún
      // owner elegido lo trae. Se lo ve con el filtro de owners apagado.
      if (porOwner && (p.ownerId === null || !duenios.has(p.ownerId))) return false;
      return true;
    })
    .map((p) => p.id);
}
