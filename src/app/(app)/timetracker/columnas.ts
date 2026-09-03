// Las columnas de la tabla de horas, en un solo lugar.
//
// Existe porque el encabezado y las filas eran dos listas independientes que
// se escribían a mano, y nada las ataba: al agregar la columna Usuario, el
// encabezado la puso después de Fecha y la fila antes, y la tabla quedó
// mostrando el usuario bajo el rótulo "Fecha". Ninguna herramienta lo podía
// ver —los dos archivos eran válidos por separado—.
//
// Ahora el orden lo define esta lista, el encabezado la recorre y la fila
// arma sus celdas en un objeto indexado por id que se recorre igual. Poner una
// celda en la columna equivocada dejó de ser posible: no hay dónde equivocarse.

export type ColumnaId =
  | "seleccion"
  | "fecha"
  | "usuario"
  | "cliente"
  | "concepto"
  | "ownership"
  | "horas"
  | "modalidad"
  | "usdHora"
  | "usdTotal"
  | "acciones";

export type Columna = {
  id: ColumnaId;
  // Vacío = sin rótulo (selección y acciones).
  etiqueta: string;
  // Valor de grid-template-columns. Los de ancho fijo son los que tienen un
  // contenido de largo conocido -una fecha, un número, dos íconos-; los tres
  // de texto libre reparten lo que sobra y recortan con ellipsis.
  //
  // minmax(0, Nfr) y no Nfr a secas: el mínimo automático de una pista de
  // grilla es el ancho de su contenido, así que con `1fr` un nombre largo
  // ensancha la tabla y aparece el scroll horizontal que se venía a sacar.
  ancho: string;
};

export const COLUMNAS_TIMETRACKER: Columna[] = [
  { id: "seleccion", etiqueta: "", ancho: "34px" },
  { id: "fecha", etiqueta: "Fecha", ancho: "92px" },
  { id: "usuario", etiqueta: "Usuario", ancho: "minmax(0,1fr)" },
  { id: "cliente", etiqueta: "Cliente", ancho: "minmax(0,1.1fr)" },
  { id: "concepto", etiqueta: "Concepto", ancho: "minmax(0,1.1fr)" },
  // Los anchos fijos los fija el RÓTULO, no el dato: en el encabezado van en
  // mayúscula y semibold, así que "Ownership" mide más que "Presencial".
  // Medido en el navegador: con 84px el encabezado mostraba "OWNERSH…".
  { id: "ownership", etiqueta: "Ownership", ancho: "96px" },
  { id: "horas", etiqueta: "Horas", ancho: "58px" },
  { id: "modalidad", etiqueta: "Modalidad", ancho: "96px" },
  { id: "usdHora", etiqueta: "USD/hora", ancho: "86px" },
  { id: "usdTotal", etiqueta: "USD total", ancho: "88px" },
  { id: "acciones", etiqueta: "", ancho: "76px" },
];

// Las clases van aparte del ancho porque Tailwind no puede compilar una clase
// armada en tiempo de ejecución: si el template quedara en un `grid-cols-[...]`
// interpolado, la regla no existiría en el CSS. El ancho viaja por style.
export const GRID_TIMETRACKER = "grid items-center gap-2";

export const ESTILO_GRID_TIMETRACKER = {
  gridTemplateColumns: COLUMNAS_TIMETRACKER.map((c) => c.ancho).join(" "),
};
