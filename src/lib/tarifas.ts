// Qué tarifa corresponde a un registro de horas.
//
// La regla es la fecha DEL REGISTRO, no la de hoy: las horas de julio valen lo
// que valía la hora en julio, se hayan cargado en julio o se corrijan en
// diciembre. Antes se tomaba siempre la vigente en ese momento, así que editar
// una typo en el concepto de un registro viejo le reescribía el monto en USD
// con la tarifa nueva. Eso reescribe facturación pasada sin que nadie lo pida.
//
// La vigencia es medio abierta: al cambiar una tarifa, la anterior cierra y la
// nueva abre con el MISMO instante, así que el borde pertenece a la nueva.

export type TarifaVigencia = {
  valorUsd: number;
  vigenteDesde: Date;
  // Null = sigue vigente.
  vigenteHasta: Date | null;
};

// De una lista de tarifas de UNA combinación (usuario + modalidad +
// ownership), la que aplica a esa fecha.
//
// Si la fecha es anterior a todas, se usa la más vieja conocida. No es un
// atajo: antes de que existiera el sistema no había tarifas cargadas, y la más
// vieja es la mejor respuesta disponible. La alternativa —negarse a guardar—
// dejaría sin poder editar los registros más antiguos, que hoy son la mayoría.
export function tarifaVigenteA(
  tarifas: TarifaVigencia[],
  fecha: Date,
): number | null {
  if (tarifas.length === 0) return null;

  const t = fecha.getTime();
  const aplicables = tarifas.filter(
    (x) =>
      x.vigenteDesde.getTime() <= t &&
      (x.vigenteHasta === null || x.vigenteHasta.getTime() > t),
  );
  if (aplicables.length > 0) {
    // Si hubiera más de una —no debería—, gana la que empezó después.
    return aplicables.reduce((a, b) =>
      a.vigenteDesde.getTime() >= b.vigenteDesde.getTime() ? a : b,
    ).valorUsd;
  }

  const masVieja = tarifas.reduce((a, b) =>
    a.vigenteDesde.getTime() <= b.vigenteDesde.getTime() ? a : b,
  );
  // Solo hacia atrás. Una fecha POSTERIOR a todas sin ninguna abierta
  // significa que la combinación quedó cerrada sin reemplazo, y ahí inventar
  // un valor sería peor que avisar.
  return fecha.getTime() < masVieja.vigenteDesde.getTime()
    ? masVieja.valorUsd
    : null;
}
