"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { Dropdown } from "@/components/dropdown";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import type { MapaTarifas, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";
const LABEL = "mb-1 block text-xs text-dc-muted";

const VALORES_INICIALES = {
  fecha: "",
  clienteId: "",
  etapaId: "",
  ownership: "owner",
  modalidad: "presencial",
  horas: "",
};

// CTA "+ Registrar horas" + modal con el mismo formulario de carga (misma
// lógica y validaciones que la fila de carga anterior, ahora en un modal).
export function RegistrarHorasBoton({
  proyectos,
  etapas,
  tarifas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoRegistro }>();
  const [pending, start] = useTransition();
  const fechaRef = useRef<HTMLInputElement>(null);

  const abrir = () => {
    setValores(VALORES_INICIALES);
    setEstado(undefined);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fechaRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearRegistro(undefined, fd);
      if (!r.error) {
        setValores(VALORES_INICIALES);
        setEstado(undefined);
        setOpen(false);
        setToast(true);
      } else {
        setEstado(r);
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
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Registrar horas
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-registrar-horas">
        <div className="dc-menu dc-pop-in w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2 id="titulo-registrar-horas" className="font-display text-sm uppercase text-white">
            Registrar horas
          </h2>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={LABEL}>Fecha</span>
                <input
                  ref={fechaRef}
                  name="fecha"
                  type="date"
                  max={hoyISO()}
                  value={valores.fecha}
                  onChange={(e) => set("fecha", e.target.value)}
                  className={cls("fecha")}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Horas</span>
                <input
                  name="horas"
                  placeholder="1,5"
                  title="Cargá un número (1,5 o 1.5); se muestra como 1:30"
                  value={valores.horas}
                  onChange={(e) => set("horas", e.target.value)}
                  onBlur={reformatearHoras}
                  className={cls("horas")}
                />
              </label>
            </div>

            <div>
              <span className={LABEL}>Proyecto</span>
              <Dropdown
                name="clienteId"
                value={valores.clienteId}
                onChange={(v) => set("clienteId", v)}
                options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
                placeholder="Elegí un proyecto"
                invalido={estado?.campo === "clienteId"}
                className="w-full"
                ariaLabel="Proyecto"
              />
            </div>

            <div>
              <span className={LABEL}>Etapa</span>
              <Dropdown
                name="etapaId"
                value={valores.etapaId}
                onChange={(v) => set("etapaId", v)}
                options={etapas.map((e) => ({ value: e.id, label: e.nombre }))}
                placeholder="Elegí una etapa"
                invalido={estado?.campo === "etapaId"}
                className="w-full"
                ariaLabel="Etapa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
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
              <div>
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
            </div>

            <div className="flex items-center justify-between rounded-xl border border-dc-line bg-dc-deeper/40 px-4 py-3 text-sm">
              <span className="text-dc-muted">
                USD/hora: <span className="tabular-nums text-dc-text">{tarifa !== undefined ? formatMonto(tarifa) : "—"}</span>
              </span>
              <span className="text-dc-muted">
                USD total: <span className="tabular-nums text-dc-text">{total !== null ? formatMonto(total) : "—"}</span>
              </span>
            </div>

            {estado?.error && (
              <p className="text-xs text-dc-pink" role="alert">{estado.error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Registrando…" : "Registrar horas"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Horas registradas
      </ToastOk>
    </>
  );
}
