"use client";

import { GRID_DATA_TABLE, alineacionDe, estiloGrid, type Columna } from "./columnas";
import {
  AlineacionColumna,
  claseFlex,
  claseTexto,
} from "@/components/campos/alineacion";

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
          {/* El rótulo se alinea con lo que diga SU columna, la misma que usa
              la celda de abajo. Antes los centraba .dc-thead por su cuenta y
              el dato se alineaba en el JSX de la fila: dos decisiones para una
              sola cosa, y por eso el título y su dato no caían sobre el mismo
              eje. */}
          {columnas.map((c) =>
            c.id === "seleccion" && encabezadoSeleccion ? (
              <span key={c.id} className={`flex ${claseFlex(alineacionDe(c))}`}>
                {encabezadoSeleccion}
              </span>
            ) : (
              <span key={c.id} className={`block truncate ${claseTexto(alineacionDe(c))}`}>
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
          // La celda hereda la alineación de su columna. Lo que renderice
          // adentro se alinea solo: no hay que repetirla en cada celda del JSX,
          // que es donde se desincronizaba del rótulo.
          <AlineacionColumna key={c.id} valor={alineacionDe(c)}>
            {/* Bloque con text-align, no flex. Con `flex flex-col` los hijos
                se estiran y text-align deja de alinearlos: el checkbox quedaba
                pegado a la izquierda mientras su rótulo iba centrado. Medido:
                9px de desvío. Como bloque, el texto se alinea por herencia y
                lo inline —el checkbox— por text-align, que es lo mismo que
                hace el encabezado. */}
            <div className={`min-w-0 ${claseTexto(alineacionDe(c))}`}>
              {celdas[c.id]}
            </div>
          </AlineacionColumna>
        ))}
      </div>
    </div>
  );
}
