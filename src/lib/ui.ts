// Estilos de botón unificados para toda la app. El efecto "push" y el
// oscurecido al hacer click son globales (ver button:active en globals.css);
// acá se define solo la forma y los colores de cada variante.
const BASE = "inline-flex items-center justify-center font-medium disabled:opacity-60";

// Acción principal (Agregar, Guardar, Ingresar, Filtrar).
export const BTN_PRIMARY = `${BASE} rounded-xl bg-dc-purple px-4 py-2 text-sm text-white hover:brightness-110`;
export const BTN_PRIMARY_SM = `${BASE} rounded-lg bg-dc-purple px-3 py-1.5 text-xs text-white hover:brightness-110`;

// Acción secundaria (Salir, Editar, Cancelar).
export const BTN_SECONDARY = `${BASE} rounded-xl border border-dc-line px-4 py-2 text-sm text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;
export const BTN_SECONDARY_SM = `${BASE} rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;

// Botón de solo ícono (acciones de tabla): mismo lenguaje que BTN_SECONDARY_SM
// pero cuadrado, para alojar un SVG de ~15px. Siempre con title/aria-label.
export const BTN_ICON_SM = `${BASE} rounded-lg border border-dc-line p-1.5 text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;

// Acción destructiva (Borrar) y su confirmación.
export const BTN_DANGER_SM = `${BASE} rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:border-dc-pink hover:bg-dc-pink/10 hover:text-dc-pink`;
export const BTN_DANGER_CONFIRM_SM = `${BASE} rounded-lg bg-dc-pink/20 px-2 py-1 text-xs text-dc-pink hover:bg-dc-pink/30`;

// Pastillas de estado clickeables (Activo/Inactivo, Bloqueado).
export const BTN_PILL_ON = `${BASE} rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri hover:bg-dc-peri/35`;
export const BTN_PILL_OFF = `${BASE} rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted hover:bg-dc-peri/20 hover:text-dc-text`;

// Mismas pastillas, pero informativas (sin afordancias de botón): para
// mostrar Activo/Inactivo en una tabla sin sugerir que se puede tocar ahí
// mismo. El cambio de estado real vive en Editar.
export const TAG_ON = "inline-flex items-center rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri";
export const TAG_OFF = "inline-flex items-center rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted";

// Botón claro sobre fondo oscuro (Continuar con Google).
export const BTN_LIGHT = `${BASE} rounded-xl border border-dc-line bg-white/95 px-4 py-2.5 text-sm text-dc-deep hover:bg-white`;
