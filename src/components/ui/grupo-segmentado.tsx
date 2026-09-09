"use client";

// Un control segmentado: pocas opciones excluyentes, todas a la vista.
//
// Sirve cuando las alternativas son dos o tres y conviene verlas juntas para
// elegir: un desplegable las esconde y obliga a abrirlo para saber qué hay, y
// un botón que alterna no dice cuáles son los estados posibles ni cuál es el
// que está puesto —solo el número que muestra, que se lee igual como "estoy
// en 2" que como "tocá para ir a 2".
//
// Está acá y no repetido en cada card porque en la misma pantalla ya se usa
// dos veces —el horizonte de semanas y el filtro de personas de "Próximas
// etapas"— y tienen que verse idénticos: mismo alto, mismo borde, mismo
// relleno del activo. Dos copias se desincronizan al primer ajuste.
export type OpcionSegmentada<T extends string> = {
  valor: T;
  // Lo que se dibuja. Puede ser texto o un ícono con su número.
  contenido: React.ReactNode;
  // Para el tooltip y el lector de pantalla, donde el ícono no alcanza.
  etiqueta: string;
};

export function GrupoSegmentado<T extends string>({
  valor,
  opciones,
  onCambiar,
  deshabilitado = false,
  tooltipDeshabilitado,
  ariaLabel,
}: {
  valor: T;
  opciones: OpcionSegmentada<T>[];
  onCambiar: (valor: T) => void;
  deshabilitado?: boolean;
  // Qué decir cuando no se puede tocar. Sin esto el tooltip explicaría la
  // opción y no por qué está apagada, que es lo que hace falta saber.
  tooltipDeshabilitado?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-lg border border-dc-line bg-dc-deeper p-0.5"
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onCambiar(o.valor)}
            disabled={deshabilitado}
            aria-pressed={activo}
            data-tooltip={deshabilitado ? tooltipDeshabilitado : o.etiqueta}
            aria-label={o.etiqueta}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs tabular-nums transition disabled:cursor-not-allowed ${
              activo
                ? "bg-dc-peri/20 text-dc-text"
                : `text-dc-muted ${deshabilitado ? "" : "hover:text-dc-text"}`
            }`}
          >
            {o.contenido}
          </button>
        );
      })}
    </div>
  );
}
