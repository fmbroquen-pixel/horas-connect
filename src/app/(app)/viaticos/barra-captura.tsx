"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { crearViatico, type CampoViatico } from "./actions";
import { BotonGuardarIcono } from "@/components/ui/acciones-fila";
import { avisarOk } from "@/components/ui/avisos";
import { hoyISO } from "@/lib/formato";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { avisarAtencion, avisarError } from "@/components/ui/avisos";
import { ETIQUETA_CONCEPTO, type OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";
const LABEL = "mb-1 block text-[11px] uppercase tracking-wide text-dc-muted";

const VALORES_INICIALES = {
  fecha: "",
  clienteId: "",
  concepto: "",
  moneda: "ARS",
  monto: "",
};

// Campos obligatorios y su etiqueta legible, en orden de foco.
const OBLIGATORIOS: { campo: CampoViatico; label: string }[] = [
  { campo: "fecha", label: "Fecha" },
  { campo: "clienteId", label: "Cliente" },
  { campo: "concepto", label: "Concepto" },
  { campo: "monto", label: "Monto" },
];

const OPCIONES_CONCEPTO = Object.entries(ETIQUETA_CONCEPTO).map(
  ([value, label]) => ({ value, label }),
);

// Barra de captura permanente de Expenses, mismo patrón que la de Time
// Tracking: el formulario vive arriba de la tabla y no en un modal, para
// poder cargar varios gastos seguidos sin abrir y cerrar nada.
//
// Lo único propio de este módulo son los campos (concepto, moneda, monto y
// comprobante en vez de horas y modalidad); la estructura, las alturas, el
// manejo de errores y el foco son los mismos.
export function BarraCapturaViatico({
  proyectos,
  usuarioId = "",
}: {
  proyectos: OpcionSelect[];
  // Dueño del gasto cuando un admin carga en nombre de otro. Vacío = el
  // propio usuario. El servidor revalida el permiso igual.
  usuarioId?: string;
}) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoViatico }>();
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const enfocar = (campo: string) => {
    const cont = formRef.current?.querySelector(`[data-campo="${campo}"]`);
    (cont?.querySelector("button, input") as HTMLElement | undefined)?.focus();
  };

  // Al desplegarse, el foco entra al primer campo: abrir y tener que buscar
  // dónde empezar a escribir es medio gesto de más en algo que se hace varias
  // veces por semana.
  useEffect(() => {
    if (abierto) setTimeout(() => enfocar("fecha"), 20);
  }, [abierto]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validación en cliente: resaltar y avisar por toast qué falta.
    const faltante = OBLIGATORIOS.find(({ campo }) => !valores[campo].trim());
    if (faltante) {
      setEstado({ campo: faltante.campo });
      avisarAtencion(`Completá el campo "${faltante.label}" para guardar el viático.`);
      enfocar(faltante.campo);
      return;
    }

    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearViatico(undefined, fd);
      if (!r.error) {
        // Precarga la siguiente: conserva cliente, fecha y moneda —lo que se
        // repite entre gastos de un mismo viaje— y limpia lo que cambia.
        setValores((v) => ({ ...v, concepto: "", monto: "" }));
        setEstado(undefined);
        if (archivoRef.current) archivoRef.current.value = "";
        setAbierto(false);
        // El formulario se pliega, así que la confirmación la da el toast
        // (y la fila nueva en la tabla).
        avisarOk("Viático registrado");
      } else {
        setEstado(r);
        if (r.error) avisarError(r.error);
        if (r.campo) enfocar(r.campo);
      }
    });
  };

  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${estado?.campo === campo ? INPUT_ERROR : ""}`;

  // Plegada por defecto: la pantalla es para MIRAR lo cargado, y un formulario
  // siempre abierto se comía la mitad del alto útil para algo que se usa unas
  // pocas veces por día. Mismo patrón que "Agregar tarea" en Follow Up.
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-dashed border-dc-peri/30 px-3 py-2 text-left text-sm text-dc-muted transition hover:border-dc-peri/60 hover:bg-dc-card hover:text-dc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar viático
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        // Esc cancela y pliega. No borra lo cargado: si se vuelve a abrir,
        // sigue ahí.
        if (e.key === "Escape") {
          e.preventDefault();
          setAbierto(false);
        }
      }}
      className="shrink-0 rounded-xl border border-dc-peri/25 bg-dc-card px-3 py-2"
      aria-label="Barra de captura de viáticos"
    >
      {/* Dueño del gasto cuando un admin carga para otra persona. */}
      {usuarioId && <input type="hidden" name="usuarioId" value={usuarioId} />}
      {/* Una sola fila, igual que Time Tracking: sin flex-wrap los campos se
          comprimen en vez de mandar el botón a un segundo renglón. El min-w-0
          de cada campo es lo que les permite achicarse. */}
      <div className="flex items-end gap-2">
        <div className="w-36 min-w-0" data-campo="fecha">
          <span className={LABEL}>Fecha</span>
          <DatePicker
            name="fecha"
            value={valores.fecha}
            onChange={(v) => set("fecha", v)}
            max={hoyISO()}
            invalido={estado?.campo === "fecha"}
            className="w-full"
            ariaLabel="Fecha"
          />
        </div>

        <div className="w-44 min-w-0" data-campo="clienteId">
          <span className={LABEL}>Cliente</span>
          <Dropdown
            name="clienteId"
            value={valores.clienteId}
            onChange={(v) => set("clienteId", v)}
            options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
            placeholder="Cliente"
            invalido={estado?.campo === "clienteId"}
            className="w-full"
            ariaLabel="Cliente"
          />
        </div>

        <div className="w-44 min-w-0" data-campo="concepto">
          <span className={LABEL}>Concepto</span>
          <Dropdown
            name="concepto"
            value={valores.concepto}
            onChange={(v) => set("concepto", v)}
            options={OPCIONES_CONCEPTO}
            placeholder="Concepto"
            invalido={estado?.campo === "concepto"}
            className="w-full"
            ariaLabel="Concepto"
          />
        </div>

        <div className="w-28 min-w-0" data-campo="moneda">
          <span className={LABEL}>Moneda</span>
          <Dropdown
            name="moneda"
            value={valores.moneda}
            onChange={(v) => set("moneda", v)}
            options={[
              { value: "ARS", label: "ARS" },
              { value: "USD", label: "USD" },
            ]}
            className="w-full"
            ariaLabel="Moneda"
          />
        </div>

        <div className="w-28 min-w-0" data-campo="monto">
          <span className={LABEL}>Monto</span>
          <input
            name="monto"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={valores.monto}
            onChange={(e) => set("monto", e.target.value)}
            className={`${cls("monto")} text-right`}
          />
        </div>

        <div className="w-56 min-w-0">
          <span className={LABEL}>Comprobante (opcional)</span>
          <input
            ref={archivoRef}
            name="archivo"
            type="file"
            // Mismo alto que el resto de los campos: el input de archivo nativo
            // no lo respeta solo.
            className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-muted file:mr-2 file:rounded-md file:border-0 file:bg-dc-line file:px-2 file:py-1 file:text-xs file:text-dc-text hover:file:bg-dc-line/70"
            aria-label="Comprobante"
          />
        </div>

        {/* Igual que en Time Tracking: cae sobre la columna de acciones de la
            tabla de abajo. Acá el ancho es el de esa columna sin sumar nada,
            porque la barra y las filas comparten el mismo padding. */}
        <span className="ml-auto flex w-[130px] shrink-0 justify-center">
          <BotonGuardarIcono pending={pending} />
        </span>
      </div>

    </form>
  );
}
