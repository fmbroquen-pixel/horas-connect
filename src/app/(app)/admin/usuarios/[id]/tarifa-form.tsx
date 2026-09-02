"use client";

import { useActionState, useRef, useState } from "react";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { useSeccionGuardable } from "@/components/guardado-pagina";
import { DatePicker } from "@/components/date-picker";
import { InfoButton } from "@/components/info-button";
import { hoyISO } from "@/lib/formato";
import { mostrarFechaISO } from "../../clientes/constantes";
import { Modal } from "@/components/ui/modal";
import { BTN_ICON_SM, BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

// La etiqueta de cualquier campo del formulario. El alto fijo no es cosmetico:
// la de "Vigente desde" lleva un info button de 20px y las otras solo texto de
// 16px, asi que sin fijarlo esa columna arrancaba 4px mas abajo que la de al
// lado.
const LABEL = "mb-1 flex h-5 items-center gap-1.5 text-xs text-dc-muted";

type ValoresActuales = {
  presencialOwner?: number;
  presencialBackup?: number;
  virtualOwner?: number;
  virtualBackup?: number;
};

type Accion = (
  prevState: { error?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string } | undefined>;

export function TarifaForm({
  tipoActual,
  valores,
  vigenteDesdeActual,
  action,
}: {
  tipoActual: "fija" | "variable" | null;
  valores: ValoresActuales;
  // Desde cuándo rige lo que hay cargado hoy, en ISO. Va en ISO y no formateado
  // porque además de mostrarse se compara: es lo que decide si el cambio es
  // retroactivo o a futuro.
  vigenteDesdeActual: string | null;
  action: Accion;
}) {
  const [tipo, setTipo] = useState<"fija" | "variable">(tipoActual ?? "variable");
  // Arranca en hoy: el caso normal es "de acá en adelante vale esto". Se
  // cambia para cargar una tarifa que ya venía rigiendo desde antes.
  const [desde, setDesde] = useState(hoyISO());
  // Contador y no booleano: dos guardados seguidos tienen que pulsar dos veces.
  const [exito, setExito] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, fd: FormData) => {
      const r = await action(prev, fd);
      if (!r?.error) setExito((n) => n + 1);
      return r;
    },
    undefined,
  );

  const valorFijaInicial =
    valores.presencialOwner ??
    valores.presencialBackup ??
    valores.virtualOwner ??
    valores.virtualBackup ??
    "";

  // El DatePicker no emite un change nativo -escribe en un input hidden desde
  // su estado-, asi que la fecha se marca aparte.
  const [sucio, setSucio] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // La vigencia se muestra como dato y no como campo: cambiarla mueve el corte
  // entre dos tarifas y puede revaluar horas ya cargadas, así que no es algo
  // que deba pasar por rozar un calendario sin querer.
  const [editandoFecha, setEditandoFecha] = useState(false);
  // La fecha elegida que todavía no se aceptó. Nada se aplica hasta confirmar.
  const [propuesta, setPropuesta] = useState<string | null>(null);

  // Contra qué se compara para decidir el aviso: la vigencia que ya está
  // guardada, no la que quedó en el formulario. Si no hay tarifa cargada
  // todavía, no hay nada que se pueda revaluar.
  const aviso =
    propuesta && vigenteDesdeActual
      ? propuesta < vigenteDesdeActual
        ? "Esta fecha es anterior a la vigencia actual y puede modificar la valorización de horas ya registradas."
        : propuesta > vigenteDesdeActual
          ? "La tarifa actual seguirá vigente hasta la nueva fecha seleccionada."
          : null
      : null;

  const coordinado = useSeccionGuardable(
    "tarifa",
    "Convenio de tarifa",
    sucio,
    async () => {
      if (!formRef.current) return;
      const r = await action(undefined, new FormData(formRef.current));
      if (r?.error) return { error: r.error };
      setSucio(false);
      setExito((n) => n + 1);
    },
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setSucio(true)}
      className="space-y-4"
    >
      {/* La misma grilla que los campos de tarifa -grid-cols-2 gap-4- y no un
          flex con justify-between: asi la columna derecha empieza exactamente
          donde empiezan "Presencial · Backup" y "Virtual · Backup", en vez de
          quedar empujada contra el borde del card. */}
      <div className="grid grid-cols-2 gap-4">
      <div>
        <p className={LABEL}>Tipo de tarifa</p>
        <div className="flex gap-2">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
              tipo === "fija"
                ? "border-dc-peri text-dc-text"
                : "border-dc-line text-dc-muted"
            }`}
          >
            <input
              type="radio"
              name="tipoTarifa"
              value="fija"
              checked={tipo === "fija"}
              onChange={() => setTipo("fija")}
              className="mr-2"
            />
            Fija
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
              tipo === "variable"
                ? "border-dc-peri text-dc-text"
                : "border-dc-line text-dc-muted"
            }`}
          >
            <input
              type="radio"
              name="tipoTarifa"
              value="variable"
              checked={tipo === "variable"}
              onChange={() => setTipo("variable")}
              className="mr-2"
            />
            Variable
          </label>
        </div>
      </div>

      {/* Vigente desde: es metadata de configuración, no un valor de tarifa.
          Por eso sube acá arriba y en chico, para que los montos se queden con
          el peso visual del bloque. */}
      <div>
        <p className={LABEL}>
          Vigente desde
          <InfoButton>
            La tarifa se aplica desde esta fecha. Las horas se valúan con la
            tarifa vigente en la fecha del registro. Las horas con valor cero
            siempre valen USD 0.
          </InfoButton>
        </p>

        {/* El valor viaja siempre por acá, se esté editando o no: así el
            DatePicker no necesita `name` y no hay dos inputs con el mismo
            nombre cuando se abre. */}
        <input type="hidden" name="vigenteDesde" value={desde} />

        {editandoFecha ? (
          <div className="w-40">
            <DatePicker
              value={desde}
              onChange={(v) => {
                // No se aplica todavía: primero hay que confirmar.
                if (v && v !== desde) setPropuesta(v);
                else setEditandoFecha(false);
              }}
              onCerrar={() => setEditandoFecha(false)}
              autoAbrir
              ariaLabel="Vigente desde"
            />
          </div>
        ) : (
          <div className="flex h-[38px] items-center gap-1.5">
            <span className="tabular-nums text-sm text-dc-text">
              {mostrarFechaISO(desde)}
            </span>
            <button
              type="button"
              onClick={() => setEditandoFecha(true)}
              data-tooltip="Editar fecha de vigencia"
              aria-label="Editar fecha de vigencia"
              className={BTN_ICON_SM}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      </div>

      {tipo === "fija" ? (
        <div>
          <label className={LABEL}>
            Valor USD por hora (presencial y virtual)
          </label>
          <input
            name="valorUsd"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={valorFijaInicial}
            required
            className="w-40 rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>
              Presencial · Owner
            </label>
            <input
              name="presencialOwner"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={valores.presencialOwner ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className={LABEL}>
              Presencial · Backup
            </label>
            <input
              name="presencialBackup"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={valores.presencialBackup ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className={LABEL}>
              Virtual · Owner
            </label>
            <input
              name="virtualOwner"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={valores.virtualOwner ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className={LABEL}>
              Virtual · Backup
            </label>
            <input
              name="virtualBackup"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={valores.virtualBackup ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
        </div>
      )}

      {state?.error && <p className="text-xs text-dc-pink">{state.error}</p>}

      {/* Cambiar la vigencia mueve el corte entre dos tarifas, y con eso puede
          cambiar cuánto valen horas ya cargadas. Se avisa antes de aceptar la
          fecha; hasta acá no se toco nada, así que cancelar es simplemente no
          cambiarla. La escritura real sigue siendo el Guardar de la pantalla. */}
      <Modal
        open={propuesta !== null}
        onClose={() => {
          setPropuesta(null);
          setEditandoFecha(false);
        }}
        labelledBy="titulo-cambio-vigencia"
      >
        <div className="w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-cambio-vigencia"
            className="font-display text-sm uppercase text-white"
          >
            Cambiar fecha de vigencia
          </h2>
          <p className="mt-3 text-sm text-dc-text">
            La nueva fecha modificará desde cuándo se aplica esta tarifa. Las
            horas registradas dentro del período afectado se recalcularán con la
            tarifa correspondiente. ¿Deseás continuar?
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-dc-line px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-dc-muted">
                Vigencia actual
              </p>
              {/* La guardada, no la que quedó en el formulario: es contra esa
                  que se mide si el cambio es retroactivo, y mostrar una y
                  comparar con otra daría un aviso que no se entiende. Sin
                  tarifa cargada todavía, la del formulario es la única que
                  hay. */}
              <p className="mt-0.5 tabular-nums text-dc-text">
                {mostrarFechaISO(vigenteDesdeActual ?? desde)}
              </p>
            </div>
            <div className="rounded-xl border border-dc-peri/50 bg-dc-peri/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-dc-muted">
                Nueva vigencia
              </p>
              <p className="mt-0.5 tabular-nums text-dc-text">
                {propuesta ? mostrarFechaISO(propuesta) : ""}
              </p>
            </div>
          </div>

          {/* La advertencia depende de hacia dónde se mueve el corte: hacia
              atrás toca horas ya cargadas, hacia adelante solo posterga. */}
          {aviso && (
            <p className="mt-3 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-3 py-2 text-xs text-dc-text">
              {aviso}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setPropuesta(null);
                setEditandoFecha(false);
              }}
              className={BTN_SECONDARY}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (propuesta) {
                  setDesde(propuesta);
                  setSucio(true);
                }
                setPropuesta(null);
                setEditandoFecha(false);
              }}
              className={BTN_PRIMARY}
            >
              Confirmar cambio
            </button>
          </div>
        </div>
      </Modal>

      {!coordinado && (
        <div className="flex justify-end">
          <BotonGuardarIcono pending={pending} label="Guardar tarifa" exito={exito} />
        </div>
      )}
    </form>
  );
}
