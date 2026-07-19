"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { crearViatico, type CampoViatico } from "./actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { hoyISO, restarDiasISO } from "@/lib/formato";
import { DIAS_VENTANA_CARGA } from "@/lib/ventana-carga";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { ToastAviso } from "@/components/ui/toast-aviso";
import { type OpcionSelect, ETIQUETA_CONCEPTO } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";
const LABEL = "mb-1 block text-xs text-dc-muted";

const INICIAL = {
  fecha: "",
  clienteId: "",
  moneda: "ARS",
  monto: "",
  concepto: "",
};

const OBLIGATORIOS: { campo: CampoViatico; label: string }[] = [
  { campo: "fecha", label: "Fecha" },
  { campo: "clienteId", label: "Cliente" },
  { campo: "concepto", label: "Concepto" },
  { campo: "monto", label: "Monto" },
];

// CTA "+ Nuevo viático" + modal con el mismo formulario de carga.
export function RegistrarViaticoBoton({ proyectos }: { proyectos: OpcionSelect[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [valores, setValores] = useState(INICIAL);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoViatico }>();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const enfocar = (campo: string) => {
    const cont = formRef.current?.querySelector(`[data-campo="${campo}"]`);
    (cont?.querySelector("button, input") as HTMLElement | undefined)?.focus();
  };

  const abrir = () => {
    setValores(INICIAL);
    setEstado(undefined);
    if (archivoRef.current) archivoRef.current.value = "";
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => enfocar("fecha"), 60);
    return () => clearTimeout(t);
  }, [open]);

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        setOpen(false);
        setToast(true);
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
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Nuevo viático
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-registrar-viatico">
        <div className="dc-menu dc-pop-in w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2 id="titulo-registrar-viatico" className="font-display text-sm uppercase text-white">
            Registrar viático
          </h2>

          <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div data-campo="fecha">
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
              <div data-campo="concepto">
                <span className={LABEL}>Concepto</span>
                <Dropdown
                  name="concepto"
                  value={valores.concepto}
                  onChange={(v) => set("concepto", v)}
                  options={Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => ({
                    value: valor,
                    label: etiqueta,
                  }))}
                  placeholder="Elegí un concepto"
                  invalido={estado?.campo === "concepto"}
                  className="w-full"
                  ariaLabel="Concepto"
                />
              </div>
            </div>

            <div data-campo="clienteId">
              <span className={LABEL}>Cliente</span>
              <Dropdown
                name="clienteId"
                value={valores.clienteId}
                onChange={(v) => set("clienteId", v)}
                options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
                placeholder="Elegí un cliente"
                invalido={estado?.campo === "clienteId"}
                className="w-full"
                ariaLabel="Cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div data-campo="moneda">
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
              <label className="block" data-campo="monto">
                <span className={LABEL}>Monto</span>
                <input
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={valores.monto}
                  onChange={(e) => set("monto", e.target.value)}
                  className={`${cls("monto")} text-right`}
                />
              </label>
            </div>

            <label className="block">
              <span className={LABEL}>Comprobante (opcional)</span>
              <input
                ref={archivoRef}
                name="archivo"
                type="file"
                accept="image/*,.pdf"
                className="w-full text-xs text-dc-muted file:mr-2 file:rounded-lg file:border file:border-dc-line file:bg-dc-deeper file:px-3 file:py-1.5 file:text-xs file:text-dc-muted"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastAviso mensaje={aviso} onClose={() => setAviso(null)} />
      <ToastOk show={toast} onHide={() => setToast(false)}>
        Viático registrado
      </ToastOk>
    </>
  );
}
