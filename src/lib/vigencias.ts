// Cómo se ordena el historial de tarifas de UNA combinación.
//
// Hasta ahora `vigenteHasta` se escribía a mano al guardar: se cerraba la
// vigente con `new Date()` y se abría la nueva con el mismo instante. Eso hacía
// que el historial fuera un registro de CLICS en Settings, no de vigencias: en
// la base quedaron filas de duración cero (poner 35 y cambiarlo a 0 en el mismo
// minuto dejaba las dos) y tramos separados por milisegundos.
//
// Acá el modelo es otro: lo único que se declara es DESDE CUÁNDO rige cada
// valor. El `vigenteHasta` de cada fila es el `vigenteDesde` de la siguiente,
// derivado y no declarado, así que la cadena no puede quedar con huecos ni con
// solapamientos. Y como las fechas se guardan con granularidad de día, dos
// cambios del mismo día son el mismo punto en la línea de tiempo: gana el
// último, que es lo que la persona quiso dejar.

export type FilaVigencia = {
  id: string;
  valorUsd: number;
  vigenteDesde: Date;
  // Desempata dos filas que declaran el mismo día: la escrita después es la
  // que vale.
  createdAt: Date;
};

export type PlanVigencias = {
  // Filas que quedan, con los dos extremos que les corresponden. Va también
  // el `vigenteDesde` —aunque lo haya traído la fila— porque el que entra
  // puede venir normalizado a día y hay que persistir esa corrección.
  actualizar: { id: string; vigenteDesde: Date; vigenteHasta: Date | null }[];
  // Filas que sobran: un cambio pisado el mismo día, o un valor repetido que
  // no cambia nada.
  eliminar: string[];
};

// Devuelve qué escribir para que el historial quede consistente. No toca la
// base: decide.
export function reconstruirVigencias(filas: FilaVigencia[]): PlanVigencias {
  const eliminar: string[] = [];
  if (filas.length === 0) return { actualizar: [], eliminar };

  const orden = [...filas].sort(
    (a, b) =>
      a.vigenteDesde.getTime() - b.vigenteDesde.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // 1. Un solo valor por fecha de inicio. Si hay varios, gana el último
  //    escrito: los anteriores nunca llegaron a regir ni un día.
  const porFecha: FilaVigencia[] = [];
  for (const f of orden) {
    const ultima = porFecha[porFecha.length - 1];
    if (ultima && ultima.vigenteDesde.getTime() === f.vigenteDesde.getTime()) {
      eliminar.push(ultima.id);
      porFecha[porFecha.length - 1] = f;
    } else {
      porFecha.push(f);
    }
  }

  // 2. Un valor que se repite no es un cambio de tarifa. Se queda la fila que
  //    lo empezó, para no partir un tramo en dos por haber guardado dos veces
  //    lo mismo.
  const vigencias: FilaVigencia[] = [];
  for (const f of porFecha) {
    const ultima = vigencias[vigencias.length - 1];
    if (ultima && ultima.valorUsd === f.valorUsd) eliminar.push(f.id);
    else vigencias.push(f);
  }

  // 3. Cada tramo cierra donde empieza el siguiente; el último queda abierto.
  const actualizar = vigencias.map((f, i) => ({
    id: f.id,
    vigenteDesde: f.vigenteDesde,
    vigenteHasta: i + 1 < vigencias.length ? vigencias[i + 1].vigenteDesde : null,
  }));

  return { actualizar, eliminar };
}

// Medianoche UTC del día de esa fecha.
//
// Las vigencias son un dato de calendario, no un instante: "desde el 1 de
// julio" no tiene hora. Guardarlas con la hora del clic era lo que generaba
// tramos de milisegundos y hacía que dos cambios del mismo día convivieran.
export function diaUtc(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}
