"use client";

import { useActionState, useState } from "react";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { DatePicker } from "@/components/date-picker";
import { hoyISO } from "@/lib/formato";

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
  // Desde cuándo rige lo que hay cargado hoy, para que se vea contra qué se
  // está cambiando. Null si el usuario todavía no tiene tarifa.
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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-dc-muted">Tipo de tarifa</p>
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
            Variable (por modalidad y ownership)
          </label>
        </div>
      </div>

      {tipo === "fija" ? (
        <div>
          <label className="mb-1 block text-xs text-dc-muted">
            Valor USD por hora (presencial y virtual)
          </label>
          <input
            name="valorUsd"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorFijaInicial}
            required
            className="w-40 rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-dc-muted">
              Presencial · Owner
            </label>
            <input
              name="presencialOwner"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valores.presencialOwner ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dc-muted">
              Presencial · Backup
            </label>
            <input
              name="presencialBackup"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valores.presencialBackup ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dc-muted">
              Virtual · Owner
            </label>
            <input
              name="virtualOwner"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valores.virtualOwner ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dc-muted">
              Virtual · Backup
            </label>
            <input
              name="virtualBackup"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valores.virtualBackup ?? ""}
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-dc-muted">Vigente desde</label>
        <div className="w-40">
          <DatePicker
            name="vigenteDesde"
            value={desde}
            onChange={setDesde}
            ariaLabel="Vigente desde"
          />
        </div>
        <p className="mt-1.5 text-xs text-dc-muted">
          {vigenteDesdeActual
            ? `Lo cargado hoy rige desde el ${vigenteDesdeActual}. `
            : ""}
          Las horas se valúan con la tarifa que regía en la fecha del registro,
          así que esta fecha decide qué horas quedan a cada valor.
        </p>
      </div>

      <p className="text-xs text-dc-muted">
        Las horas cargadas como &quot;Valor cero&quot; siempre valen USD 0,
        no hace falta configurarlas.
      </p>

      {state?.error && <p className="text-xs text-dc-pink">{state.error}</p>}

      <div className="flex justify-end">
        <BotonGuardarIcono pending={pending} label="Guardar tarifa" exito={exito} />
      </div>
    </form>
  );
}
