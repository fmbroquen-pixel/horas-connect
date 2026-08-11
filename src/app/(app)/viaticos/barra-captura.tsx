"use client";

import { useRef, useState, useTransition } from "react";
import { crearViatico, type CampoViatico } from "./actions";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { hoyISO, restarDiasISO } from "@/lib/formato";
import { DIAS_VENTANA_CARGA } from "@/lib/ventana-carga";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { ToastAviso } from "@/components/ui/toast-aviso";
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
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Cuántos viáticos se guardaron bien en esta sesión de carga. Lo lee el
  // botón para pulsar el check: acá se carga de a muchos seguidos y sin una
  // señal por viático no se sabe si el último entró.
  const [guardados, setGuardados] = useState(0);
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validación en cliente: resaltar y avisar por toast qué falta.
    const faltante = OBLIGATORIOS.find(({ campo }) => !valores[campo].trim());
    if (faltante) {
      setEstado({ campo: faltante.campo });
      setAviso(`Completá el campo "${faltante.label}" para guardar el viático.`);
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
        setGuardados((n) => n + 1);
        setTimeout(() => enfocar("concepto"), 20);
      } else {
        setEstado(r);
        if (r.error) setAviso(r.error);
        if (r.campo) enfocar(r.campo);
      }
    });
  };

  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${estado?.campo === campo ? INPUT_ERROR : ""}`;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="shrink-0 rounded-xl border border-dc-peri/25 bg-dc-card p-3"
      aria-label="Barra de captura de viáticos"
    >
      {/* Dueño del gasto cuando un admin carga para otra persona. */}
      {usuarioId && <input type="hidden" name="usuarioId" value={usuarioId} />}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-36" data-campo="fecha">
          <span className={LABEL}>Fecha</span>
          <DatePicker
            name="fecha"
            value={valores.fecha}
            onChange={(v) => set("fecha", v)}
            max={hoyISO()}
            min={restarDiasISO(hoyISO(), DIAS_VENTANA_CARGA)}
            invalido={estado?.campo === "fecha"}
            className="w-full"
            ariaLabel="Fecha"
          />
        </div>

        <div className="w-44" data-campo="clienteId">
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

        <div className="w-44" data-campo="concepto">
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

        <div className="w-28" data-campo="moneda">
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

        <div className="w-28" data-campo="monto">
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

        <div className="w-56">
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
        <span className="ml-auto flex w-[130px] justify-center">
          <BotonGuardarIcono pending={pending} exito={guardados} />
        </span>
      </div>

      <ToastAviso mensaje={aviso} onClose={() => setAviso(null)} />
    </form>
  );
}
