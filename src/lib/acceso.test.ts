import { describe, expect, it } from "vitest";
import { clientesVisibles, puedeVerProyecto, type Asignacion } from "./acceso";

const cli = (id: string, nombre: string, activo = true) => ({ id, nombre, activo });

const ACME = cli("1", "Acme");
const BETA = cli("2", "Beta");
const VIEJO = cli("3", "Cliente viejo", false);
const TODOS = [BETA, ACME, VIEJO];

const asignar = (
  ...pares: [typeof ACME, string | null][]
): Asignacion<typeof ACME>[] => pares.map(([cliente, rol]) => ({ cliente, rol }));

describe("clientesVisibles", () => {
  describe("admin", () => {
    it("ve todos los activos aunque no tenga ninguna asignación", () => {
      expect(clientesVisibles("admin", TODOS, []).map((c) => c.nombre)).toEqual([
        "Acme",
        "Beta",
      ]);
    });

    it("estar asignado a uno no le achica la vista al resto", () => {
      const soloUno = asignar([ACME, "owner"]);
      expect(clientesVisibles("admin", TODOS, soloUno)).toHaveLength(2);
    });

    it("los inactivos salen por separado", () => {
      expect(
        clientesVisibles("admin", TODOS, [], { activo: false }).map((c) => c.nombre),
      ).toEqual(["Cliente viejo"]);
    });
  });

  describe("no admin", () => {
    // El bug que hubo: sin asignaciones se veía TODO el portafolio. Un permiso
    // no se amplía porque falten datos.
    it("sin asignaciones no ve nada", () => {
      expect(clientesVisibles("guest", TODOS, [])).toEqual([]);
      expect(clientesVisibles("reader", TODOS, [])).toEqual([]);
      expect(clientesVisibles("", TODOS, [])).toEqual([]);
    });

    it("ve exactamente lo asignado, no el resto", () => {
      const asignaciones = asignar([ACME, null]);
      expect(clientesVisibles("guest", TODOS, asignaciones).map((c) => c.id)).toEqual([
        "1",
      ]);
    });

    it("una asignación a un cliente inactivo no aparece entre los activos", () => {
      const asignaciones = asignar([VIEJO, "owner"]);
      expect(clientesVisibles("guest", TODOS, asignaciones)).toEqual([]);
      expect(
        clientesVisibles("guest", TODOS, asignaciones, { activo: false }),
      ).toHaveLength(1);
    });
  });

  describe("soloConRol", () => {
    // El Home de CORE pregunta de qué proyectos sos responsable, no en cuáles
    // podés cargar horas.
    const asignaciones = asignar([ACME, "owner"], [BETA, null]);

    it("deja fuera las asignaciones sin rol declarado", () => {
      expect(
        clientesVisibles("guest", TODOS, asignaciones, { soloConRol: true }).map(
          (c) => c.nombre,
        ),
      ).toEqual(["Acme"]);
    });

    it("sin el filtro entran las dos", () => {
      expect(clientesVisibles("guest", TODOS, asignaciones)).toHaveLength(2);
    });

    it("al admin no lo afecta: no depende de asignaciones", () => {
      expect(
        clientesVisibles("admin", TODOS, [], { soloConRol: true }),
      ).toHaveLength(2);
    });
  });

  it("siempre ordenado por nombre", () => {
    const desordenados = [cli("1", "Zeta"), cli("2", "Alfa"), cli("3", "Media")];
    expect(
      clientesVisibles("admin", desordenados, []).map((c) => c.nombre),
    ).toEqual(["Alfa", "Media", "Zeta"]);
  });
});

describe("puedeVerProyecto", () => {
  it("el admin entra siempre", () => {
    expect(puedeVerProyecto("admin", false)).toBe(true);
  });

  it("el mentor solo si está asignado", () => {
    expect(puedeVerProyecto("guest", true)).toBe(true);
    expect(puedeVerProyecto("guest", false)).toBe(false);
  });

  it("el reader no entra aunque esté asignado", () => {
    // Su vista es Analytics; la pantalla del proyecto no es para él.
    expect(puedeVerProyecto("reader", true)).toBe(false);
  });

  it("un rol desconocido no entra", () => {
    // Lo que no está permitido explícitamente, no se permite.
    expect(puedeVerProyecto("", true)).toBe(false);
    expect(puedeVerProyecto("superadmin", true)).toBe(false);
  });
});
