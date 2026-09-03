"use client";

import { createContext, useContext } from "react";

export type Alineacion = "izquierda" | "centro";

// La alineación horizontal de una celda, heredada de su columna.
//
// Existe porque el encabezado y las celdas la decidían por separado: los
// rótulos van centrados por .dc-thead y cada celda elegía la suya en el JSX de
// la fila. Tres columnas quedaron en "izquierda" y el rótulo centrado encima,
// así que el título y su dato no estaban sobre el mismo eje.
//
// Vive acá, con las celdas, y no en data-table: son las celdas las que definen
// qué significa alinearse. Una data table lo provee desde su lista de columnas
// —ahí está la única fuente— y Follow Up no lo provee: sus celdas siguen
// alineándose con su prop, como siempre.
const Ctx = createContext<Alineacion>("centro");

export function AlineacionColumna({
  valor,
  children,
}: {
  valor: Alineacion;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

// La alineación efectiva: lo que pida la celda gana; si no pide nada, la de su
// columna; y sin columna, centrado.
export function useAlineacion(propia?: Alineacion): Alineacion {
  const heredada = useContext(Ctx);
  return propia ?? heredada;
}

// Las clases, en un solo lugar, para que el rótulo y el dato no puedan usar
// criterios distintos para decir lo mismo.
export function claseTexto(a: Alineacion): string {
  return a === "centro" ? "text-center" : "text-left";
}

export function claseFlex(a: Alineacion): string {
  return a === "centro" ? "justify-center text-center" : "justify-start text-left";
}
