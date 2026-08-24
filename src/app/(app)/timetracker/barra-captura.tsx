"use client";

import { useRef, useState, useTransition } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { ToastAviso } from "@/components/ui/toast-aviso";
import type { MapaTarifas, OpcionConcepto, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";
const LABEL = "mb-1 block text-[11px] uppercase tracking-wide text-dc-muted";

const VALORES_INICIALES = {
  fecha: "",
  clienteId: "",
  conceptoId: "",
  ownership: "owner",
  modalidad: "presencial",
  horas: "",
};

// Campos obligatorios y su etiqueta legible, en orden de foco.
const OBLIGATORIOS: { campo: CampoRegistro; label: string }[] = [
  { campo: "fecha", label: "Fecha" },
  { campo: "clienteId", label: "Cliente" },
  { campo: "conceptoId", label: "Concepto" },
  { campo: "horas", label: "Horas" },
];

// Barra de captura permanente (no es la primera fila de la tabla): componente
// independiente, optimizado para cargar varias horas seguidas solo con teclado.
export function BarraCaptura({
  proyectos,
  conceptos,
  tarifas,
  usuarioId = "",
}: {
  proyectos: OpcionSelect[];
  conceptos: OpcionConcepto[];
  tarifas: MapaTarifas;
  // Usuario dueño de las horas cuando un admin carga en nombre de otro.
  // Vacío = el propio usuario. El servidor revalida el permiso igual.
  usuarioId?: string;
}) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoRegistro }>();
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Cuántos registros se guardaron bien en esta sesión de carga. Lo lee el
  // botón para pulsar el check: acá se carga de a muchos seguidos y sin una
  // señal por registro no se sabe si el último entró.
  const [guardados, setGuardados] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

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
      setAviso(`Completá el campo "${faltante.label}" para guardar el registro.`);
      enfocar(faltante.campo);
      return;
    }

    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearRegistro(undefined, fd);
      if (!r.error) {
        // Precarga la siguiente carga: conserva proyecto, ownership y modalidad
        // (y la fecha del día); limpia los campos que cambian.
        setValores((v) => ({ ...v, conceptoId: "", horas: "" }));
        setEstado(undefined);
        setGuardados((n) => n + 1);
        setTimeout(() => enfocar("conceptoId"), 20);
      } else {
        setEstado(r);
        if (r.error) setAviso(r.error);
        if (r.campo) enfocar(r.campo);
      }
    });
  };

  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${estado?.campo === campo ? INPUT_ERROR : ""}`;

  const tarifa = tarifas[`${valores.modalidad}-${valores.ownership}`];
  const horasDecimal = parseHorasHsMin(valores.horas);
  const total =
    tarifa !== undefined && horasDecimal !== null && horasDecimal > 0
      ? tarifa * horasDecimal
      : null;

  const reformatearHoras = () => {
    const formateado = reformatEntradaHoras(valores.horas);
    if (formateado) set("horas", formateado);
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="shrink-0 rounded-xl border border-dc-peri/25 bg-dc-card px-3 py-2"
      aria-label="Barra de captura de horas"
    >
      {/* Dueño de las horas cuando un admin carga para otro mentor. */}
      {usuarioId && <input type="hidden" name="usuarioId" value={usuarioId} />}
      {/* Una sola fila, sin flex-wrap. Con wrap, los campos y el carril de
          acciones suman más ancho del que suele haber disponible y el botón
          se iba solo a un segundo renglón, dejando un hueco vacío arriba.
          Sin wrap, los campos se comprimen —de ahí el min-w-0 en cada uno, que
          es lo que permite a un flex item bajar del ancho de su contenido— y
          el carril de la derecha se queda quieto. */}
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

        <div className="w-52 min-w-0" data-campo="conceptoId">
          <span className={LABEL}>Concepto</span>
          <Dropdown
            name="conceptoId"
            value={valores.conceptoId}
            onChange={(v) => set("conceptoId", v)}
            options={conceptos.map((c) => ({ value: c.id, label: c.nombre }))}
            placeholder={conceptos.length === 0 ? "Sin conceptos" : "Concepto"}
            invalido={estado?.campo === "conceptoId"}
            className="w-full"
            ariaLabel="Concepto"
          />
        </div>

        <div className="w-32 min-w-0" data-campo="ownership">
          <span className={LABEL}>Ownership</span>
          <Dropdown
            name="ownership"
            value={valores.ownership}
            onChange={(v) => set("ownership", v)}
            options={[
              { value: "owner", label: "Owner" },
              { value: "backup", label: "Backup" },
            ]}
            className="w-full"
            ariaLabel="Ownership"
          />
        </div>

        <div className="w-24 min-w-0" data-campo="horas">
          <span className={LABEL}>Horas</span>
          <input
            name="horas"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="1,5"
            title="Cargá un número (1,5 o 1.5); se muestra como 1:30"
            value={valores.horas}
            onChange={(e) => set("horas", e.target.value)}
            onBlur={reformatearHoras}
            className={cls("horas")}
          />
        </div>

        <div className="w-32 min-w-0" data-campo="modalidad">
          <span className={LABEL}>Modalidad</span>
          <Dropdown
            name="modalidad"
            value={valores.modalidad}
            onChange={(v) => set("modalidad", v)}
            options={[
              { value: "presencial", label: "Presencial" },
              { value: "virtual", label: "Virtual" },
            ]}
            className="w-full"
            ariaLabel="Modalidad"
          />
        </div>

        <div className="w-24 min-w-0">
          <span className={LABEL}>USD total</span>
          <span className="block truncate px-1 py-1.5 text-right text-sm tabular-nums text-dc-text">
            {total !== null ? formatMonto(total) : "—"}
          </span>
        </div>

        {/* Cae justo sobre la columna de acciones de la tabla de abajo, no
            pegado a USD total: guardar acá y editar/eliminar allá son lo
            mismo —lo que se le hace al registro— y comparten carril.

            El ancho es el de esa columna (130px) más 4px: la barra tiene
            padding 3 y las filas de la tabla padding 4, así que sin esa
            compensación el carril quedaría corrido esos 4px. En Expenses los
            dos paddings coinciden y por eso ahí va sin sumar nada. */}
        <span className="ml-auto flex w-[134px] shrink-0 justify-center pr-1">
          <BotonGuardarIcono pending={pending} exito={guardados} />
        </span>
      </div>

      <ToastAviso mensaje={aviso} onClose={() => setAviso(null)} />
    </form>
  );
}
