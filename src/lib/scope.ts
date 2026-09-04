import { prisma } from "@/lib/prisma";
import { mesDeParams, rangoDelMes } from "@/lib/mes";
import {
  filtraAlgo,
  idsFiltrados,
  ownersDe,
  parsearIds,
  type OpcionFiltro,
  type ProyectoDelScope,
} from "@/lib/scope-filtros";
import type { Cliente } from "@/generated/prisma/client";

export type { OpcionFiltro, ProyectoDelScope };

// Los parámetros de URL que gobiernan el scope. Los mismos en Home y en
// Analytics: un link de una pantalla se lee igual en la otra.
export type ParamsScope = {
  anio?: string;
  mes?: string;
  proyectos?: string;
  owners?: string;
};

export type Scope = {
  anio: number;
  mes: number;
  desde: string;
  hasta: string;

  // Todo lo que el usuario alcanza en el período, con su ficha completa.
  // Analytics la necesita entera -cuota, fecha de inicio, baja- y así no la
  // vuelve a consultar.
  clientes: Cliente[];

  // Las opciones de cada filtro.
  proyectosOpciones: OpcionFiltro[];
  ownersOpciones: OpcionFiltro[];

  // Lo elegido, ya validado contra lo que existe.
  proyectosSeleccionados: string[];
  ownersSeleccionados: string[];

  // LO QUE CONSUME TODO EL MÓDULO: los proyectos que sobreviven a los filtros.
  // KPIs, cards, tablas y gráficos se arman con esto y con nada más.
  ids: string[];

  // Todo lo alcanzable, sin filtrar. Sirve para distinguir "no tenés
  // proyectos" -un cartel de onboarding- de "el filtro no deja ninguno", que
  // son dos pantallas vacías por motivos opuestos.
  idsAccesibles: string[];

  hayFiltro: boolean;
};

// Arma el scope de una pantalla.
//
// Recibe CÓMO se traen los proyectos en vez de decidirlo: el alcance no es el
// mismo en las dos pantallas -el Home muestra donde uno tiene rol declarado y
// Analytics lo que uno puede leer- y esa regla vive en lib/proyecto-acceso, que
// es donde se prueba. Acá solo se resuelven los filtros sobre lo que ese
// alcance devolvió.
export async function resolverScope(
  params: ParamsScope,
  traerProyectos: (desdeISO: string) => Promise<Cliente[]>,
): Promise<Scope> {
  const { anio, mes } = mesDeParams(params.anio, params.mes);
  const { desde, hasta } = rangoDelMes(anio, mes);

  const clientes = await traerProyectos(desde);
  const idsAccesibles = clientes.map((c) => c.id);

  // El Mentor Owner de cada proyecto. Es una sola consulta para todo el módulo:
  // que cada componente la repitiera era justamente la lógica paralela que hay
  // que evitar.
  const asignaciones =
    idsAccesibles.length === 0
      ? []
      : await prisma.proyectoAsignado.findMany({
          where: { clienteId: { in: idsAccesibles }, rol: "owner" },
          select: {
            clienteId: true,
            usuarioId: true,
            usuario: { select: { nombre: true } },
          },
        });
  const ownerPorCliente = new Map(
    asignaciones.map((a) => [a.clienteId, { id: a.usuarioId, nombre: a.usuario.nombre }]),
  );

  const proyectos: ProyectoDelScope[] = clientes.map((c) => {
    const owner = ownerPorCliente.get(c.id);
    return {
      id: c.id,
      nombre: c.nombre,
      ownerId: owner?.id ?? null,
      ownerNombre: owner?.nombre ?? null,
    };
  });

  const proyectosOpciones = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const ownersOpciones = ownersDe(proyectos);

  const proyectosSeleccionados = parsearIds(params.proyectos, idsAccesibles);
  const ownersSeleccionados = parsearIds(
    params.owners,
    ownersOpciones.map((o) => o.id),
  );

  return {
    anio,
    mes,
    desde,
    hasta,
    clientes,
    proyectosOpciones,
    ownersOpciones,
    proyectosSeleccionados,
    ownersSeleccionados,
    ids: idsFiltrados(proyectos, proyectosSeleccionados, ownersSeleccionados),
    idsAccesibles,
    hayFiltro:
      filtraAlgo(proyectosSeleccionados, proyectosOpciones.length) ||
      filtraAlgo(ownersSeleccionados, ownersOpciones.length),
  };
}

// Los filtros tal como los consume la barra de la pantalla. Está acá para que
// las dos páginas la armen igual y un filtro nuevo se agregue en un solo lugar.
export function filtrosDeScope(scope: Scope) {
  return [
    {
      clave: "proyectos",
      nombre: "Proyectos",
      opciones: scope.proyectosOpciones,
      seleccionados: scope.proyectosSeleccionados,
    },
    {
      clave: "owners",
      nombre: "Mentor Owner",
      opciones: scope.ownersOpciones,
      seleccionados: scope.ownersSeleccionados,
    },
  ];
}
