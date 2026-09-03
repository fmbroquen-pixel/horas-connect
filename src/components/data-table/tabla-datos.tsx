"use client";

import {
  GRID_DATA_TABLE,
  estiloGrid,
  type Columna,
} from "./columnas";

// La cáscara de una data table: encabezado fijo, cuerpo con scroll propio y
// estado vacío. Lo que cambia entre Time Tracking y Expenses son las columnas
// y las filas; todo lo de alrededor es lo mismo y estaba escrito dos veces.
//
// No la usa Follow Up, y no debería: ahí las filas son pasos de un plan con
// secuencia, dependencias y arrastre, no registros intercambiables.

export function TablaDatos<Id extends string>({
  columnas,
  vacia,
  mensajeVacio,
  encabezadoSeleccion,
  children,
}: {
  columnas: Columna<Id>[];
  vacia: boolean;
  mensajeVacio: string;
  // El checkbox de "seleccionar todo", si la tabla tiene selección. La cáscara
  // no sabe qué está seleccionado: solo le hace lugar en su columna.
  encabezadoSeleccion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Sin ancho mínimo: las columnas de texto reparten lo que hay y recortan
    // con ellipsis, así que la tabla entra siempre. El overflow-x queda como
    // último recurso para anchos por debajo de la suma de las columnas fijas,
    // no como forma de convivir con el desborde.
    <div className="flex min-h-0 flex-1 overflow-x-auto dc-panel">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className={`dc-thead ${GRID_DATA_TABLE} shrink-0 border-b border-dc-line px-4`}
          style={estiloGrid(columnas)}
        >
          {columnas.map((c) =>
            c.id === "seleccion" && encabezadoSeleccion ? (
              <span key={c.id}>{encabezadoSeleccion}</span>
            ) : (
              <span key={c.id} className="truncate">
                {c.etiqueta}
              </span>
            ),
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
          {vacia && (
            <p className="px-4 py-6 text-center text-sm text-dc-muted">
              {mensajeVacio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// La grilla de UNA fila, con las mismas columnas que el encabezado. Cada celda
// va envuelta en un contenedor con min-w-0: sin eso un flex/grid item no puede
// achicarse por debajo de su contenido y el ellipsis nunca llega a activarse.
//
// Las celdas llegan indexadas por id y se recorren con la lista de columnas:
// es lo que hace imposible poner una celda en la columna equivocada.
export function FilaDatos<Id extends string>({
  columnas,
  celdas,
  className = "",
  contenedorRef,
}: {
  columnas: Columna<Id>[];
  celdas: Record<Id, React.ReactNode>;
  className?: string;
  contenedorRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={contenedorRef}
      className={`border-b border-dc-line px-4 py-2 last:border-0 ${className}`}
    >
      <div className={GRID_DATA_TABLE} style={estiloGrid(columnas)}>
        {columnas.map((c) => (
          <div key={c.id} className="min-w-0">
            {celdas[c.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
