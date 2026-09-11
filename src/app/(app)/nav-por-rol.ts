import type { ItemSidebar } from "./sidebar";
import { MODULOS } from "@/lib/modulos";

// Navegación única y persistente en la sidebar. Orden: Home · Proyectos ·
// Time Tracking · Expenses · Time Off · Analytics · Settings (desplegable).
// Expenses y Time Off aparecen solo si su flag está habilitado (ver
// lib/modulos): el ítem y la ruta se encienden y se apagan juntos.
//
// Vive fuera del layout para poder probar qué ve cada rol sin levantar una
// sesión: el menú es lo primero que dice qué puede tocar alguien.
const ITEM_PROYECTOS: ItemSidebar = {
  href: "/proyectos",
  label: "Proyectos",
  icono: "proyectos",
  children: [
    { href: "/proyectos", label: "Activos", icono: "proyectos" },
    { href: "/proyectos/inactivos", label: "Inactivos", icono: "archivado" },
  ],
};

const ITEMS_CARGA: ItemSidebar[] = [
  { href: "/dashboard", label: "Home", icono: "home" },
  ITEM_PROYECTOS,
  { href: "/timetracker", label: "Time Tracking", icono: "reloj" },
  ...(MODULOS.expenses
    ? [{ href: "/viaticos", label: "Expenses", icono: "auto" }]
    : []),
  ...(MODULOS.timeOff
    ? [{ href: "/vacaciones", label: "Time Off", icono: "sombrilla" }]
    : []),
];

const ITEM_ANALYTICS: ItemSidebar = {
  href: "/rentabilidad",
  label: "Analytics",
  icono: "analytics",
};

// Settings de quien no es admin: una sola pestaña, Usuario, que es su propio
// perfil. Es la misma página de siempre (/mi-perfil) -en solo lectura, con sus
// datos y nada más-; lo único nuevo es que se llega igual que el admin llega a
// la suya, desde el desplegable de Settings. Sin listado de otros usuarios: la
// pestaña no apunta a /admin, que además redirige a quien no es admin.
const SETTINGS_PERFIL: ItemSidebar = {
  href: "/mi-perfil",
  label: "Settings",
  icono: "settings",
  match: "/mi-perfil",
  children: [{ href: "/mi-perfil", label: "Usuario", icono: "usuarios" }],
};

export function navParaRol(rol: string): {
  items: ItemSidebar[];
  settings?: ItemSidebar;
} {
  if (rol === "guest") {
    return { items: ITEMS_CARGA, settings: SETTINGS_PERFIL };
  }
  if (rol === "admin") {
    return {
      items: [...ITEMS_CARGA, ITEM_ANALYTICS],
      settings: {
        href: "/admin/usuarios",
        label: "Settings",
        icono: "settings",
        match: "/admin",
        children: [
          { href: "/admin/usuarios", label: "Usuarios", icono: "usuarios" },
          { href: "/admin/clientes", label: "Clientes", icono: "clientes" },
          { href: "/admin/conceptos", label: "Conceptos", icono: "conceptos" },
        ],
      },
    };
  }
  // reader: la rentabilidad de sus clientes asignados, y su perfil.
  return { items: [ITEM_ANALYTICS], settings: SETTINGS_PERFIL };
}
