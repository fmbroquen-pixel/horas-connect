"use client";

import type { HorasStack } from "@/lib/rentabilidad";
import { formatHorasHsMin } from "@/lib/horas";

// La paleta de los mentores. El rosa va en su version profunda: el #ff91ff de
// la marca, en una barra llena al lado del peri, se lee con el mismo peso y las
// dos series se confunden.
const PALETA = ["#8b8cff", "#e05ce0", "#602eca", "#6f7bff", "#c9a7ff", "#3f7fd6"];

const fmtUsd = (v: number) =>
  (v < 0 ? "-" : "") + "$" + Math.abs(Math.round(v)).toLocaleString("es-AR");

// Las tres columnas que comparten los dos graficos: nombre, pista y valor.
// Estan aca y no repetidas en cada uno porque el eje de abajo tiene que caer
// exactamente sobre las mismas columnas que las filas; si se desincronizan, las
// marcas dejan de coincidir con las lineas de referencia.
// En pantalla angosta el nombre y el valor ceden ancho: con las medidas de
// escritorio la pista quedaba en unos 60px y las barras dejaban de compararse.
const COLUMNAS =
  "grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_3.25rem] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4.5rem] items-center gap-2 sm:gap-3";

const FRACCIONES = [0, 0.25, 0.5, 0.75, 1];

// ---------------------------------------------------------------------------
// Piezas compartidas
//
// Los dos graficos de esta pantalla -margen y horas- son el mismo objeto con
// distinto contenido: una fila por cliente, el nombre a la izquierda, barras
// horizontales de extremo redondeado y un valor a la derecha. Se dibujan en DOM
// y no con Chart.js, que dibuja en un canvas: su layout no deja meter nada
// entre las barras y el borde, y forzarlo hubiera sido pintar texto en el
// bitmap -que no se selecciona, no escala con el zoom del navegador y no lo lee
// un lector de pantalla-.
// ---------------------------------------------------------------------------

// El tope del eje, elegido a partir del PASO y no al reves.
//
// Redondear el maximo directo a 1, 2 o 5 dejaba mucho aire: con un maximo de
// 1.250 el eje se iba a 2.000 y las barras usaban dos tercios del ancho. Aca se
// busca primero un paso "lindo" para las cuatro divisiones -100, 250, 400,
// 500...- y el tope sale de multiplicarlo. Con 1.250 da 1.600, que aprovecha el
// ancho y deja marcas que igual se leen de un vistazo.
const PASOS = [1, 2, 2.5, 4, 5, 10];

function escalaLinda(max: number): number {
  const crudo = max / 4;
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)));
  const normalizado = crudo / magnitud;
  const paso = (PASOS.find((p) => normalizado <= p) ?? 10) * magnitud;
  return paso * 4;
}

function escalaDe(valores: number[]) {
  const tope = escalaLinda(Math.max(...valores, 1));
  return { tope, marcas: FRACCIONES.map((f) => tope * f) };
}

// La pista de una fila: las lineas de referencia y, encima, las barras.
function Pista({
  marcas,
  children,
}: {
  marcas: number[];
  children: React.ReactNode;
}) {
  return (
    <span className="relative block h-6">
      <span aria-hidden className="absolute inset-0 flex justify-between">
        {marcas.map((_, m) => (
          <span key={m} className="w-px bg-dc-peri/10" />
        ))}
      </span>
      {children}
    </span>
  );
}

function Fila({
  nombre,
  detalle,
  marcas,
  barras,
  valor,
}: {
  nombre: string;
  detalle: string;
  marcas: number[];
  barras: React.ReactNode;
  valor: React.ReactNode;
}) {
  return (
    <div
      data-tooltip={detalle}
      className={`${COLUMNAS} rounded-lg py-1.5 transition-colors hover:bg-dc-peri/[0.06]`}
    >
      <span className="truncate text-right text-xs text-dc-muted">{nombre}</span>
      <Pista marcas={marcas}>{barras}</Pista>
      {valor}
    </div>
  );
}

// El eje X. Usa las mismas columnas que las filas para que cada marca caiga
// sobre su linea de referencia.
function Eje({
  marcas,
  formato,
}: {
  marcas: number[];
  formato: (v: number) => string;
}) {
  return (
    <div className={`mt-1 ${COLUMNAS}`}>
      <span />
      <span className="flex justify-between border-t border-dc-line pt-1 text-[10px] text-dc-muted">
        {marcas.map((v, m) => (
          // En angosto sobreviven la primera, la del medio y la ultima: cinco
          // rotulos en esa pista se pisaban unos con otros. Al quedar tres, el
          // justify-between los deja en 0, 50 y 100%, que es justo donde caen
          // sus lineas de referencia.
          <span
            key={m}
            className={m % 2 === 1 ? "hidden tabular-nums sm:inline" : "tabular-nums"}
          >
            {formato(v)}
          </span>
        ))}
      </span>
      <span />
    </div>
  );
}

function Leyenda({ items }: { items: { nombre: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-[11px] text-dc-muted">
      {items.map((i) => (
        <span key={i.nombre} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: i.color }}
          />
          {i.nombre}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 01 - Margen por cliente
// ---------------------------------------------------------------------------

// Las barras van SUPERPUESTAS y no una debajo de la otra: el costo se lee
// contra el cobrado -cuanto de lo que entra se va en mentores- y separarlas
// obligaba a comparar dos longitudes que arrancan en lugares distintos. La de
// costo va mas fina y encima, como un termometro sobre la de cobrado.
export function MargenChart({
  proyectos,
  cobrado,
  costo,
  pct,
}: {
  proyectos: string[];
  cobrado: number[];
  costo: number[];
  pct: (number | null)[];
}) {
  if (proyectos.length === 0) {
    return <SinDatos />;
  }

  // De menor a mayor margen: el que peor rinde queda arriba, que es lo que hay
  // que mirar primero. Los que no tienen margen calculable -sin ingreso- van
  // antes que todos: no son "los mejores", son a los que les falta la cuota o
  // gastaron sin cobrar, y dejarlos al fondo los hacia leer como el extremo
  // bueno de la lista. Entre ellos manda el costo.
  const filas = proyectos
    .map((nombre, i) => ({
      nombre,
      cobrado: cobrado[i] ?? 0,
      costo: costo[i] ?? 0,
      pct: pct[i] ?? null,
    }))
    .sort((a, b) => {
      if (a.pct === null || b.pct === null) {
        if (a.pct === b.pct) return b.costo - a.costo;
        return a.pct === null ? -1 : 1;
      }
      return a.pct - b.pct;
    });

  const { tope, marcas } = escalaDe([...cobrado, ...costo]);
  const ancho = (v: number) => `${Math.max(0, Math.min(1, v / tope)) * 100}%`;

  // El promedio, solo sobre los que tienen margen calculable. Con uno solo no
  // hay promedio que sirva de referencia: seria ese mismo numero.
  const conMargen = filas
    .map((f) => f.pct)
    .filter((p): p is number => p !== null);
  const promedio =
    conMargen.length >= 2
      ? conMargen.reduce((a, v) => a + v, 0) / conMargen.length
      : null;
  // Como las filas ya vienen ordenadas por margen, el promedio cae en un punto
  // exacto de la lista: todo lo de arriba esta por debajo y todo lo de abajo
  // por encima.
  const corte =
    promedio === null
      ? -1
      : filas.filter((f) => f.pct === null || f.pct < promedio).length;

  return (
    <div>
      {filas.map((f, i) => (
        <div key={f.nombre}>
          {i === corte && promedio !== null && <LineaPromedio pct={promedio} />}
          <Fila
            nombre={f.nombre}
            detalle={`${f.nombre} — Cobrado ${fmtUsd(f.cobrado)} · Costo mentores ${fmtUsd(f.costo)} · Margen ${f.pct === null ? "—" : `${f.pct.toFixed(1)}%`}`}
            marcas={marcas}
            barras={
              <>
                {/* Cobrado: la barra de fondo, gruesa. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-3.5 -translate-y-1/2 rounded-r-full bg-dc-peri"
                  style={{ width: ancho(f.cobrado) }}
                />
                {/* Costo: encima y mas fina. Se lee cuanto de lo que entra se
                    consume, sin tener que medir dos barras separadas. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-r-full bg-dc-pink-deep"
                  style={{ width: ancho(f.costo) }}
                />
              </>
            }
            valor={
              // En la fila y no en un listado aparte: el porcentaje es de ESTE
              // cliente y se lee junto a sus barras.
              <span
                className={`justify-self-end rounded-full px-2 py-0.5 text-center text-[11px] font-medium tabular-nums ${
                  f.pct === null
                    ? "bg-dc-line/60 text-dc-muted"
                    : f.pct < 0
                      ? "bg-dc-pink/15 text-dc-pink"
                      : "bg-dc-peri/15 text-dc-peri"
                }`}
              >
                {f.pct === null ? "—" : `${f.pct.toFixed(0)}%`}
              </span>
            }
          />
        </div>
      ))}
      {/* Si todos rinden por debajo del promedio -pasa cuando uno solo se va
          muy arriba y tira la media- la linea cierra la lista. */}
      {corte === filas.length && promedio !== null && (
        <LineaPromedio pct={promedio} />
      )}

      <Eje marcas={marcas} formato={fmtUsd} />
      <Leyenda
        items={[
          { nombre: "Cobrado", color: "var(--dc-peri)" },
          { nombre: "Costo mentores", color: "var(--dc-pink-deep)" },
        ]}
      />
    </div>
  );
}

// La referencia del promedio de margen.
//
// Va HORIZONTAL y no vertical, aunque una linea de promedio en un grafico de
// barras suela ser vertical, porque aca el eje horizontal son dolares: poner
// "62%" a los 62/100 del ancho lo dejaria parado sobre $992 y se leeria como
// una plata. El promedio es de porcentajes, y el unico eje donde el porcentaje
// esta ordenado es el vertical, porque las filas ya van de menor a mayor
// margen. Asi la linea dice algo verdadero de un vistazo: lo de arriba rinde
// menos que el promedio, lo de abajo mas.
function LineaPromedio({ pct }: { pct: number }) {
  return (
    <div
      data-tooltip={`Promedio margen: ${pct.toFixed(1)}%`}
      className={`${COLUMNAS} py-1`}
    >
      <span className="truncate text-right text-[10px] uppercase tracking-wider text-dc-pink">
        Promedio
      </span>
      {/* Punteada y rosa: las lineas de referencia del fondo son verticales,
          continuas y peri al 10%, asi que no hay forma de confundirlas. */}
      <span
        aria-hidden
        className="block h-px border-t border-dashed border-dc-pink/55"
      />
      <span className="justify-self-end rounded-full border border-dashed border-dc-pink/45 px-2 py-0.5 text-center text-[11px] font-medium tabular-nums text-dc-pink">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 02 - Horas por cliente y mentor
// ---------------------------------------------------------------------------

// Mismo objeto visual que el margen -fila por cliente, barra horizontal de
// extremo redondeado, valor a la derecha-, con el dato propio: las horas
// apiladas por quien las entrego. La barra es una sola y los mentores son
// tramos adentro, asi el largo total sigue siendo comparable entre clientes.
export function HorasStackChart({ stack }: { stack: HorasStack }) {
  if (stack.proyectos.length === 0 || stack.mentores.length === 0) {
    return <SinDatos />;
  }

  // De mayor a menor: donde se va el tiempo, arriba.
  const filas = stack.proyectos
    .map((nombre, i) => {
      const tramos = stack.mentores
        .map((m, j) => ({
          nombre: m.nombre,
          horas: m.horas[i] ?? 0,
          color: PALETA[j % PALETA.length],
        }))
        .filter((t) => t.horas > 0);
      return { nombre, tramos, total: tramos.reduce((a, t) => a + t.horas, 0) };
    })
    .sort((a, b) => b.total - a.total);

  const { tope, marcas } = escalaDe(filas.map((f) => f.total));

  return (
    <div>
      {filas.map((f) => (
        <Fila
          key={f.nombre}
          nombre={f.nombre}
          detalle={`${f.nombre} — ${f.tramos.map((t) => `${t.nombre} ${formatHorasHsMin(t.horas)}`).join(" · ")} · Total ${formatHorasHsMin(f.total)} hs`}
          marcas={marcas}
          barras={
            <span
              aria-hidden
              className="absolute left-0 top-1/2 flex h-3.5 -translate-y-1/2 overflow-hidden rounded-r-full"
              style={{
                width: `${Math.max(0, Math.min(1, f.total / tope)) * 100}%`,
              }}
            >
              {f.tramos.map((t) => (
                <span
                  key={t.nombre}
                  className="h-full"
                  style={{
                    width: `${(t.horas / f.total) * 100}%`,
                    background: t.color,
                    // Corte entre tramos sin gastar ancho: un borde real
                    // correria los porcentajes de la fila.
                    boxShadow: "inset -1px 0 0 0 rgba(16,13,56,.55)",
                  }}
                />
              ))}
            </span>
          }
          valor={
            <span className="justify-self-end text-[11px] tabular-nums text-dc-muted">
              {formatHorasHsMin(f.total)}
            </span>
          }
        />
      ))}

      <Eje marcas={marcas} formato={(v) => `${v.toLocaleString("es-AR")} hs`} />
      <Leyenda
        items={stack.mentores.map((m, j) => ({
          nombre: m.nombre,
          color: PALETA[j % PALETA.length],
        }))}
      />
    </div>
  );
}

function SinDatos() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-dc-muted">
      No hay datos para el mes seleccionado.
    </div>
  );
}
