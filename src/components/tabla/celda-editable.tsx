"use client";

import { useRef, useState } from "react";
import { Dropdown, type OpcionDropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { reformatEntradaHoras } from "@/lib/horas";

// Celdas con edición inline y autoguardado, compartidas por Time Tracking y
// Roadmap. El contrato es siempre el mismo:
//   · un clic (o Enter/Espacio con el foco puesto) entra en edición;
//   · salir del campo o presionar Enter guarda;
//   · Escape cancela y deja el valor anterior;
//   · no hay botón de guardar.
// Las celdas se montan recién al editarlas: una tabla de 500 filas no puede
// tener un input por columna montado todo el tiempo.

export type GuardarCampo = (
  valor: string,
) => Promise<{
  error?: string;
  // El cambio no se aplicó y la celda tiene que volver al valor anterior, pero
  // sin mostrar un error: quien llamó ya se encarga de explicarlo.
  revertir?: boolean;
}>;

const BASE_LECTURA =
  "flex w-full items-center rounded-md px-1.5 py-1 text-sm transition hover:bg-dc-peri/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40";
const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Estado compartido: valor local (optimista mientras guarda), estado de
// guardado y el último error del servidor.
function useCelda(valor: string, onGuardar: GuardarCampo) {
  const [servidor, setServidor] = useState(valor);
  const [local, setLocal] = useState(valor);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  // El servidor manda: cuando llega un valor nuevo (revalidación tras
  // guardar, o un cambio hecho desde otro lado) pisa lo que haya local.
  // Ajustar estado durante el render es el patrón recomendado para
  // sincronizar con props, y evita el parpadeo de un useEffect.
  if (valor !== servidor) {
    setServidor(valor);
    setLocal(valor);
    setError(undefined);
  }

  const cancelar = () => {
    setLocal(servidor);
    setError(undefined);
    setEditando(false);
  };

  const confirmar = async (nuevo: string) => {
    setEditando(false);
    if (nuevo === servidor) {
      setError(undefined);
      return;
    }
    // Optimista: se muestra el valor nuevo mientras viaja al servidor.
    setLocal(nuevo);
    setGuardando(true);
    const r = await onGuardar(nuevo);
    setGuardando(false);
    if (r?.error) {
      setError(r.error);
      setLocal(servidor); // rechazado: vuelve al último valor bueno
    } else if (r?.revertir) {
      // El cambio no se aplicó, pero quien llamó se encarga de explicar por
      // qué —un popup, por ejemplo—. La celda vuelve atrás sin poner un error
      // en rojo que duplicaría el mensaje.
      setError(undefined);
      setLocal(servidor);
    } else {
      setError(undefined);
    }
  };

  return { local, editando, setEditando, guardando, error, cancelar, confirmar };
}

// Envoltura común: marca sutil de "guardando" y el error del servidor debajo,
// sin mover el alto de la fila.
function Celda({
  children,
  guardando,
  error,
}: {
  children: React.ReactNode;
  guardando: boolean;
  error?: string;
}) {
  return (
    <span className="relative block min-w-0">
      <span className={guardando ? "block opacity-45 transition-opacity" : "block"}>
        {children}
      </span>
      {error && (
        <span
          role="alert"
          data-tooltip={error}
          className="mt-0.5 block truncate text-[11px] leading-tight text-dc-pink"
        >
          {error}
        </span>
      )}
    </span>
  );
}

// Botón de lectura: parece texto hasta que se lo señala. Es lo que comunica
// que la celda se puede editar sin ensuciar la tabla con bordes de input.
function Lectura({
  onEditar,
  alinear,
  titulo,
  children,
}: {
  onEditar: () => void;
  alinear: "izquierda" | "centro";
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onEditar}
      data-tooltip={titulo}
      // Marca para que la fila pueda encontrar su primera celda editable. El
      // botón de editar de la fila la usa para entrar en edición desde ahí:
      // en una tabla que se edita celda por celda, ese botón no abre ningún
      // modo aparte, lleva al primer campo.
      data-celda-editable
      className={`${BASE_LECTURA} ${alinear === "centro" ? "justify-center text-center" : "justify-start text-left"}`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

// Texto plano para celdas no editables (fila cerrada, campo calculado).
export function CeldaSoloLectura({
  children,
  alinear = "centro",
  titulo,
  tenue = false,
}: {
  children: React.ReactNode;
  alinear?: "izquierda" | "centro";
  titulo?: string;
  tenue?: boolean;
}) {
  return (
    <span
      data-tooltip={titulo}
      className={`block truncate px-1.5 py-1 text-sm ${tenue ? "text-dc-muted" : "text-dc-text"} ${
        alinear === "centro" ? "text-center" : "text-left"
      }`}
    >
      {children}
    </span>
  );
}

// ── Texto libre ───────────────────────────────────────────────────────────

export function CeldaTexto({
  valor,
  onGuardar,
  ariaLabel,
  alinear = "centro",
  editable = true,
  formatearAlGuardar,
  placeholder = "—",
  mostrar,
}: {
  valor: string;
  onGuardar: GuardarCampo;
  ariaLabel: string;
  alinear?: "izquierda" | "centro";
  editable?: boolean;
  // Normaliza lo tipeado antes de mandarlo (por ejemplo, horas "1,5" → "1:30").
  formatearAlGuardar?: (v: string) => string;
  placeholder?: string;
  // Cómo se LEE el valor cuando la celda no está en edición. Se edita siempre
  // en crudo: con el formato puesto —un separador de miles, por ejemplo— el
  // campo no se puede seguir escribiendo.
  mostrar?: (v: string) => string;
}) {
  const c = useCelda(valor, onGuardar);
  // Escape desmonta el input y eso dispara un blur: sin esta marca, el blur
  // guardaría justo lo que se acaba de cancelar.
  const cancelado = useRef(false);

  if (!editable) {
    return (
      <CeldaSoloLectura alinear={alinear} titulo={c.local}>
        {c.local ? (mostrar ? mostrar(c.local) : c.local) : placeholder}
      </CeldaSoloLectura>
    );
  }

  return (
    <Celda guardando={c.guardando} error={c.error}>
      {c.editando ? (
        <input
          autoFocus
          defaultValue={c.local}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur(); // el blur es el que guarda
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelado.current = true;
              c.cancelar();
            }
          }}
          onBlur={(e) => {
            if (cancelado.current) {
              cancelado.current = false;
              return;
            }
            const v = e.target.value.trim();
            c.confirmar(formatearAlGuardar ? formatearAlGuardar(v) : v);
          }}
          className={`${INPUT} ${alinear === "centro" ? "text-center" : "text-left"}`}
        />
      ) : (
        <Lectura
          onEditar={() => c.setEditando(true)}
          alinear={alinear}
          titulo={c.local || ariaLabel}
        >
          {c.local ? (mostrar ? mostrar(c.local) : c.local) : placeholder}
        </Lectura>
      )}
    </Celda>
  );
}

// Horas en formato hs:min, con la misma normalización que la barra de carga.
export function CeldaHoras(props: Omit<CeldaTextoProps, "formatearAlGuardar">) {
  return (
    <CeldaTexto
      {...props}
      formatearAlGuardar={(v) => reformatEntradaHoras(v) || v}
    />
  );
}

type CeldaTextoProps = React.ComponentProps<typeof CeldaTexto>;

// ── Fecha ─────────────────────────────────────────────────────────────────

export function CeldaFecha({
  valor,
  onGuardar,
  ariaLabel,
  mostrar,
  min,
  max,
  editable = true,
}: {
  valor: string; // YYYY-MM-DD
  onGuardar: GuardarCampo;
  ariaLabel: string;
  mostrar: (iso: string) => string;
  min?: string;
  max?: string;
  editable?: boolean;
}) {
  const c = useCelda(valor, onGuardar);

  if (!editable) {
    return <CeldaSoloLectura>{mostrar(c.local)}</CeldaSoloLectura>;
  }

  return (
    <Celda guardando={c.guardando} error={c.error}>
      {c.editando ? (
        <DatePicker
          value={c.local}
          onChange={(v) => c.confirmar(v)}
          min={min}
          max={max}
          autoAbrir
          // Cerrar sin elegir (Escape o clic afuera) sale de edición sin tocar
          // nada; si eligió, confirmar ya corrió antes de este cierre.
          onCerrar={() => c.setEditando(false)}
          className="w-full"
          ariaLabel={ariaLabel}
        />
      ) : (
        <Lectura
          onEditar={() => c.setEditando(true)}
          alinear="centro"
          titulo={ariaLabel}
        >
          <span className="tabular-nums">{mostrar(c.local)}</span>
        </Lectura>
      )}
    </Celda>
  );
}

// ── Opciones (desplegable) ────────────────────────────────────────────────

export function CeldaOpciones({
  valor,
  opciones,
  onGuardar,
  ariaLabel,
  alinear = "centro",
  editable = true,
  placeholder = "—",
  etiqueta,
  renderLectura,
}: {
  valor: string;
  opciones: OpcionDropdown[];
  onGuardar: GuardarCampo;
  ariaLabel: string;
  alinear?: "izquierda" | "centro";
  editable?: boolean;
  placeholder?: string;
  // Etiqueta a mostrar cuando el valor no está entre las opciones (por
  // ejemplo, un registro viejo que conserva su etapa anterior).
  etiqueta?: string;
  // Cómo dibujar el valor cuando NO se está editando. Sin esto se muestra el
  // texto pelado. Lo usa el estado de una tarea, que se lee como pastilla de
  // color pero se sigue editando con el mismo dropdown.
  renderLectura?: (valor: string) => React.ReactNode;
}) {
  const c = useCelda(valor, onGuardar);
  const texto = opciones.find((o) => o.value === c.local)?.label ?? etiqueta ?? "";

  if (!editable) {
    // Sin atenuar. Se atenuaba para distinguir una celda cerrada de una
    // abierta, cuando "abierta" era el estado normal; desde que la tabla es de
    // lectura por defecto, atenuarla sería pintar de gris todos los datos y
    // dejar que resalten justo los que no se pueden tocar.
    return (
      <CeldaSoloLectura alinear={alinear} titulo={texto}>
        {texto || placeholder}
      </CeldaSoloLectura>
    );
  }

  return (
    <Celda guardando={c.guardando} error={c.error}>
      {c.editando ? (
        <Dropdown
          value={c.local}
          onChange={(v) => c.confirmar(v)}
          options={opciones}
          placeholder={placeholder}
          autoAbrir
          onCerrar={() => c.setEditando(false)}
          className="w-full"
          ariaLabel={ariaLabel}
        />
      ) : (
        <Lectura
          onEditar={() => c.setEditando(true)}
          alinear={alinear}
          titulo={texto || ariaLabel}
        >
          {renderLectura ? renderLectura(c.local) : texto || placeholder}
        </Lectura>
      )}
    </Celda>
  );
}
