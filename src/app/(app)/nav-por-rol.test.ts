import { describe, expect, it } from "vitest";
import { navParaRol } from "./nav-por-rol";

// Todos los destinos a los que un rol puede llegar desde la sidebar.
function destinos(rol: string): string[] {
  const { items, settings } = navParaRol(rol);
  return [...items, ...(settings ? [settings] : [])].flatMap((i) => [
    i.href,
    ...(i.children ?? []).map((c) => c.href),
  ]);
}

describe("navParaRol", () => {
  it("admin conserva Settings con Usuarios, Clientes y Conceptos", () => {
    const { items, settings } = navParaRol("admin");
    expect(settings?.children?.map((c) => c.href)).toEqual([
      "/admin/usuarios",
      "/admin/clientes",
      "/admin/conceptos",
    ]);
    expect(items.map((i) => i.href)).toContain("/rentabilidad");
  });

  it("mentor ve Settings con una sola pestaña: Usuario, su perfil", () => {
    const { items, settings } = navParaRol("guest");
    expect(settings?.children).toEqual([
      { href: "/mi-perfil", label: "Usuario", icono: "usuarios" },
    ]);
    expect(items.map((i) => i.href)).not.toContain("/rentabilidad");
  });

  it("reader ve Analytics y Settings con la pestaña Usuario", () => {
    const { items, settings } = navParaRol("reader");
    expect(items.map((i) => i.href)).toEqual(["/rentabilidad"]);
    expect(settings?.children).toEqual([
      { href: "/mi-perfil", label: "Usuario", icono: "usuarios" },
    ]);
  });

  it("solo admin tiene algún link al listado de usuarios o a /admin", () => {
    for (const rol of ["guest", "reader"]) {
      expect(destinos(rol).some((d) => d.startsWith("/admin"))).toBe(false);
    }
    expect(destinos("admin")).toContain("/admin/usuarios");
  });
});
