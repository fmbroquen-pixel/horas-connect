"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Los avisos breves de toda la app, con un único host montado en el layout.
//
// El host va arriba y no en cada pantalla por un motivo concreto: quien avisa
// suele desaparecer justo después —la fila que se elimina se desmonta, el
// formulario de alta se pliega al guardar— y se llevaría con él cualquier toast
// que dibujara. Acá el emisor es una función suelta: se avisa y se olvida, sin
// importar si el que avisó sigue existiendo un instante después.

export type TipoAviso = "ok" | "atencion" | "error";

type Aviso = { id: number; tipo: TipoAviso; mensaje: string };

// Cuánto queda en pantalla cada tipo. Un "guardado" se lee de reojo y estorba
// si se queda; un error hay que poder leerlo dos veces, y por eso además se
// puede cerrar a mano.
const DURACION: Record<TipoAviso, number> = {
  ok: 2800,
  atencion: 6000,
  error: 6000,
};

// Duración de la animación de salida. Tiene que coincidir con dc-aviso-out en
// globals.css, o el aviso se sacaría de la pantalla a mitad del fundido.
const SALIDA_MS = 240;

let proximoId = 1;
let avisos: Aviso[] = [];
const oyentes = new Set<() => void>();

// La lista es inmutable: cada cambio la reemplaza. Eso es lo que le permite a
// useSyncExternalStore comparar por identidad y no re-renderizar de más.
const VACIA: Aviso[] = [];

function publicar() {
  for (const o of oyentes) o();
}

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

function emitir(tipo: TipoAviso, mensaje: string) {
  avisos = [...avisos, { id: proximoId++, tipo, mensaje }];
  publicar();
}

function quitar(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  publicar();
}

// Salió bien. El mensaje lo pone quien hizo la acción, porque solo ahí se sabe
// qué pasó ("Tarea enviada a papelera", "Hora registrada").
export function avisarOk(mensaje: string) {
  emitir("ok", mensaje);
}

// Algo que conviene saber pero no impide seguir.
export function avisarAtencion(mensaje: string) {
  emitir("atencion", mensaje);
}

// Falló. Nunca con el estilo de confirmación: no puede parecer que algo salió
// bien cuando no salió.
export function avisarError(mensaje: string) {
  emitir("error", mensaje);
}

const ACENTO: Record<TipoAviso, string> = {
  ok: "text-dc-green",
  atencion: "text-dc-pink",
  error: "text-dc-pink",
};

function Icono({ tipo }: { tipo: TipoAviso }) {
  const comun = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: `shrink-0 ${ACENTO[tipo]}`,
  };
  if (tipo === "ok") {
    return (
      <svg {...comun}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (tipo === "atencion") {
    return (
      <svg {...comun}>
        <path d="M12 3l9.5 17H2.5z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg {...comun}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function Aviso({ aviso }: { aviso: Aviso }) {
  const [saliendo, setSaliendo] = useState(false);
  // El hover pausa: si alguien acercó el mouse es porque lo está leyendo, y
  // que se vaya justo ahí es lo más molesto que puede hacer un aviso.
  const [pausado, setPausado] = useState(false);
  const salidaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cerrar = () => {
    if (salidaRef.current) return;
    setSaliendo(true);
    salidaRef.current = setTimeout(() => quitar(aviso.id), SALIDA_MS);
  };

  useEffect(() => {
    if (pausado || saliendo) return;
    const t = setTimeout(cerrar, DURACION[aviso.tipo]);
    return () => clearTimeout(t);
    // Sin array de dependencias completo a propósito: `cerrar` se redefine en
    // cada render y no queremos reiniciar la cuenta por eso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausado, saliendo, aviso.tipo]);

  useEffect(() => () => {
    if (salidaRef.current) clearTimeout(salidaRef.current);
  }, []);

  return (
    <div
      role={aviso.tipo === "ok" ? "status" : "alert"}
      aria-live={aviso.tipo === "ok" ? "polite" : "assertive"}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      // Fondo y borde neutros siempre: el color del estado va solo en el ícono.
      // Un toast verde o rojo lleno se apropia de la pantalla y compite con el
      // violeta de la marca por algo que dura dos segundos.
      className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-dc-line bg-dc-deep px-4 py-3 text-sm font-semibold text-dc-text shadow-[0_12px_32px_rgba(0,0,0,0.45)] ${
        saliendo ? "dc-aviso-out" : "dc-aviso-in"
      }`}
    >
      <Icono tipo={aviso.tipo} />
      <span className="min-w-0">{aviso.mensaje}</span>
      {aviso.tipo !== "ok" && (
        <button
          type="button"
          onClick={cerrar}
          title="Cerrar"
          aria-label="Cerrar aviso"
          className="-mr-1 ml-1 shrink-0 rounded-md p-1 text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// El host. Se dibuja dentro de #zona-avisos, un ancla que el layout pone en la
// columna de contenido: así los avisos quedan centrados sobre lo que se está
// mirando y no debajo de la sidebar. Si el ancla no existe —una pantalla fuera
// del layout, como el login— cae al <body>.
export function Avisos() {
  // useSyncExternalStore y no un useEffect que copie a estado: es la API hecha
  // para esto, y evita el render de más que deja un setState dentro de un
  // efecto. En el servidor no hay avisos, de ahí el snapshot vacío.
  const lista = useSyncExternalStore(
    suscribir,
    () => avisos,
    () => VACIA,
  );

  // Mismo truco para saber si ya estamos en el cliente: en el servidor no hay
  // document y el portal no se puede resolver.
  const enCliente = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!enCliente || lista.length === 0) return null;
  const ancla = document.getElementById("zona-avisos") ?? document.body;

  return createPortal(
    // Los más nuevos abajo: apilan desde el borde inferior hacia arriba, que es
    // de donde entran.
    <div className="pointer-events-none absolute inset-x-0 bottom-7 z-[70] flex flex-col items-center gap-2 px-4">
      {lista.map((a) => (
        <Aviso key={a.id} aviso={a} />
      ))}
    </div>,
    ancla,
  );
}
