// Constantes compartidas del módulo Clientes. IMPORTANTE: este archivo no
// lleva "use client" porque lo importan tanto Server Components (páginas)
// como componentes de cliente (formularios); ver tipos.ts de vacaciones.

// Productos contratables. Se guarda la clave en la base y se muestra la
// etiqueta; agregar una opción acá no requiere migración.
export const ETIQUETA_PRODUCTO: Record<string, string> = {
  okr: "OKR",
  traction: "Traction",
  directorio_embarca: "Directorio Embarca",
  okr4startups: "OKR-4-Startups",
  otro: "Otro",
};

export const OPCIONES_PRODUCTO = Object.entries(ETIQUETA_PRODUCTO).map(
  ([value, label]) => ({ value, label }),
);

// Roles de los integrantes del equipo del cliente.
export const ETIQUETA_ROL_EQUIPO: Record<string, string> = {
  sponsor: "Sponsor",
  embajador_okr: "Embajador OKR",
  lider_proyecto: "Líder del proyecto",
  project_manager: "Project Manager",
  resp_comercial: "Responsable Comercial",
  resp_operativo: "Responsable Operativo",
  resp_rrhh: "Responsable RRHH",
  resp_finanzas: "Responsable Finanzas",
  resp_tecnologia: "Responsable Tecnología",
  colaborador: "Colaborador",
  otro: "Otro",
};

export const OPCIONES_ROL_EQUIPO = Object.entries(ETIQUETA_ROL_EQUIPO).map(
  ([value, label]) => ({ value, label }),
);

// Grilla del listado de Equipo: Nombre · Apellido · Rol · Cumpleaños · (acciones).
export const GRID_EQUIPO =
  "grid min-w-[780px] grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(170px,1fr)_minmax(130px,1fr)_130px] items-center gap-2";

export type MiembroFila = {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  cumpleanos: string; // YYYY-MM-DD o "" si no está cargado
};

// Suma meses a una fecha ISO (YYYY-MM-DD) ajustando el día al último del mes
// destino cuando no existe (31/01 + 1 mes → 28/02). Es el cálculo de la
// "Fecha de finalización" (fecha de inicio + duración), que nunca se guarda.
export function sumarMesesISO(iso: string, meses: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isInteger(meses)) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = total % 12; // 0-11
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function mostrarFechaISO(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
