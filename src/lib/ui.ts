// Estilos de botón unificados para toda la app. El efecto "push" y el
// oscurecido al hacer click son globales (ver button:active en globals.css);
// acá se define solo la forma y los colores de cada variante.
const BASE = "inline-flex items-center justify-center font-medium disabled:opacity-60";

// Acción principal (Agregar, Guardar, Ingresar, Filtrar).
//
// El borde transparente no se ve: está para que el primario mida lo mismo que
// el secundario, que sí tiene borde. Sin él quedaba 2px más bajo. En una fila no
// se notaba —el stretch del flex los iguala— pero apilados en columna, como en
// el aviso de cambios sin guardar, la diferencia saltaba.
export const BTN_PRIMARY = `${BASE} rounded-xl border border-transparent bg-dc-purple px-4 py-2 text-sm text-white hover:brightness-110`;
export const BTN_PRIMARY_SM = `${BASE} rounded-lg border border-transparent bg-dc-purple px-3 py-1.5 text-xs text-white hover:brightness-110`;

// Crear una entidad nueva: violeta sólido, "+" blanco y el nombre de lo que se
// crea. Es la acción principal de su pantalla, así que toma la forma del botón
// primario —mismo alto, mismo radio, mismo padding— y le suma el ícono.
//
// El gap-1.5 separa el "+" del texto sin que parezcan dos cosas; el resto es
// BTN_PRIMARY tal cual, para que crear y guardar hablen el mismo idioma.
export const BTN_AGREGAR = `${BASE} gap-1.5 rounded-xl border border-transparent bg-dc-purple px-4 py-2 text-sm text-white hover:brightness-110`;

// Acción secundaria (Salir, Editar, Cancelar).
export const BTN_SECONDARY = `${BASE} rounded-xl border border-dc-line px-4 py-2 text-sm text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;
export const BTN_SECONDARY_SM = `${BASE} rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;

// Botón de solo ícono (acciones de tabla): mismo lenguaje que BTN_SECONDARY_SM
// pero cuadrado, para alojar un SVG de ~15px. Siempre con title/aria-label.
export const BTN_ICON_SM = `${BASE} rounded-lg border border-dc-line p-1.5 text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text`;

// Confirmar un formulario (guardar, crear), en versión ícono: el mismo
// cuadrado y el mismo radio que BTN_ICON_SM, en verde.
//
// Verde y no el violeta de marca porque es la única acción de la app que
// CONFIRMA, y el violeta ya significa "acción" en general (agregar, aplicar,
// navegar). Pero DELINEADO y no relleno: un botón sólido verde se apropia de
// la pantalla y pelea con la identidad violeta de CORE. El contorno alcanza
// para distinguirlo de sus vecinos —que son grises— sin gritar, y deja el
// verde lleno libre para lo único que sí es un evento: el pulso al guardar.
export const BTN_ICON_OK_SM = `${BASE} rounded-lg border border-dc-green/55 p-1.5 text-dc-green hover:border-dc-green hover:bg-dc-green/10 hover:shadow-[0_0_10px_rgba(52,211,153,0.22)]`;

// Acción destructiva (Borrar) y su confirmación.
export const BTN_DANGER_SM = `${BASE} rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:border-dc-pink hover:bg-dc-pink/10 hover:text-dc-pink`;
export const BTN_DANGER_CONFIRM_SM = `${BASE} rounded-lg bg-dc-pink/20 px-2 py-1 text-xs text-dc-pink hover:bg-dc-pink/30`;

// Versiones de solo ícono de las acciones destructivas (cuadradas, mismo
// tamaño que BTN_ICON_SM). Danger = tacho; confirm = check en rosa lleno.
export const BTN_ICON_DANGER_SM = `${BASE} rounded-lg border border-dc-line p-1.5 text-dc-muted hover:border-dc-pink hover:bg-dc-pink/10 hover:text-dc-pink`;
export const BTN_ICON_CONFIRM_SM = `${BASE} rounded-lg bg-dc-pink/20 p-1.5 text-dc-pink hover:bg-dc-pink/30`;

// El brillo peri de lo elegido. Sale de la opción marcada en la asignación de
// proyectos de un usuario, que fue la primera en usarlo: un anillo fino más
// un halo corto, suficiente para destacar sobre el fondo oscuro sin neón.
export const GLOW_PERI =
  "shadow-[0_0_0_1px_rgba(139,140,255,0.35),0_0_14px_rgba(139,140,255,0.18)]";

// Una fila -o una celda- que NAVEGA. Es texto, no un botón: en reposo no hay
// caja, porque en una lista de veinte filas veinte pastillas son ruido. El
// área clickeable se revela al pasar o al llegar con el teclado: fondo peri
// suave y un anillo fino. Anillo y no borde porque el anillo no ocupa lugar, y
// aparecer no puede correr el contenido.
//
// Solo lleva lo interactivo: el layout -ancho, padding, alineación- lo pone
// cada lista, que no son todas iguales.
export const LINK_FILA =
  "rounded-lg outline-none ring-inset transition hover:bg-dc-peri/10 hover:ring-1 hover:ring-dc-peri/30 focus-visible:bg-dc-peri/10 focus-visible:ring-2 focus-visible:ring-dc-peri/40";

// Una pastilla que ELIGE un valor y abre un desplegable. Lo contrario de
// LINK_FILA: tiene que verse como control aunque nadie la esté tocando, así que
// en reposo ya lleva borde y relleno, y al pasar se enciende con GLOW_PERI.
// Sin chevron: la forma de pastilla con borde ya dice que se toca.
//
// Mide w-full: el ancho lo decide su columna, y el nombre trunca adentro.
export const PILL_SELECTOR = `${BASE} w-full gap-1.5 truncate rounded-full border px-3 py-1.5 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri/40`;
// Con valor: texto claro sobre peri, más contraste que el peri sobre peri.
export const PILL_SELECTOR_ON = `border-dc-peri/60 bg-dc-peri/15 text-white hover:border-dc-peri hover:bg-dc-peri/25 hover:shadow-[0_0_0_1px_rgba(139,140,255,0.35),0_0_14px_rgba(139,140,255,0.18)]`;
// Abierto: queda encendida mientras el desplegable está a la vista.
export const PILL_SELECTOR_ABIERTO = `border-dc-peri bg-dc-peri/25 text-white ${GLOW_PERI}`;
// Sin valor: borde punteado. Dice que falta algo, no que esté apagada.
export const PILL_SELECTOR_VACIO =
  "border-dashed border-dc-muted/50 text-dc-muted hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text";
export const PILL_SELECTOR_SOLO_LECTURA =
  "cursor-not-allowed border-dc-line bg-dc-line/60 text-dc-muted opacity-60";

// Un selector que es SOLO un punto de color: el semáforo. Mismo idioma que
// PILL_SELECTOR en versión redonda y sin texto. En reposo, un aro fino alrededor
// del punto: lo mínimo para que se lea como botón sin sumarle caja a una lista.
// Al pasar se enciende con GLOW_PERI y queda encendido mientras está abierto.
//
// El tamaño lo pone quien lo usa: en una fila es compacto, en una card es el
// único contenido.
export const DOT_SELECTOR =
  "inline-flex shrink-0 items-center justify-center rounded-full outline-none ring-1 ring-inset transition focus-visible:ring-2 focus-visible:ring-dc-peri/40";
export const DOT_SELECTOR_ON =
  "ring-dc-line hover:bg-dc-peri/10 hover:ring-dc-peri/70 hover:shadow-[0_0_0_1px_rgba(139,140,255,0.35),0_0_14px_rgba(139,140,255,0.18)]";
export const DOT_SELECTOR_ABIERTO = `bg-dc-peri/15 ring-dc-peri ${GLOW_PERI}`;
export const DOT_SELECTOR_SOLO_LECTURA = "cursor-not-allowed opacity-50 ring-transparent";

// Pastilla informativa. Activo/Inactivo dejó de usarla -eso es un
// interruptor, ver components/ui/switch-estado- y quedó para los estados que
// solo se leen, como el tipo de tarifa de un usuario.
export const TAG_ON = "inline-flex items-center rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri";
export const TAG_OFF = "inline-flex items-center rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted";

// Botón claro sobre fondo oscuro (Continuar con Google).
export const BTN_LIGHT = `${BASE} rounded-xl border border-dc-line bg-white/95 px-4 py-2.5 text-sm text-dc-deep hover:bg-white`;
