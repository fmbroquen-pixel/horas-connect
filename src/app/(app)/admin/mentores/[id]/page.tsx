import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarMentor, guardarTarifa } from "../actions";
import { TarifaForm } from "./tarifa-form";

const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};
const ETIQUETA_ROL: Record<string, string> = {
  titular: "Titular",
  acompanante: "Acompañante",
  valor_cero: "Valor cero",
};

export default async function MentorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) notFound();

  const tarifas = await prisma.tarifa.findMany({
    where: { mentorId: id },
    orderBy: { vigenteDesde: "desc" },
  });
  const vigentes = tarifas.filter((t) => t.vigenteHasta === null);
  const historial = tarifas.filter((t) => t.vigenteHasta !== null);

  const buscarValor = (modalidad: string, rol: string) => {
    const t = vigentes.find((v) => v.modalidad === modalidad && v.rol === rol);
    return t ? Number(t.valorUsd) : undefined;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-lg uppercase text-white">
          {mentor.nombre}
        </h1>
        <form
          action={actualizarMentor.bind(null, mentor.id)}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            name="nombre"
            defaultValue={mentor.nombre}
            className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
          <input
            name="email"
            type="email"
            defaultValue={mentor.email}
            className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
          <button
            type="submit"
            className="rounded-lg border border-dc-line px-4 py-2 text-sm text-dc-muted hover:text-dc-text"
          >
            Guardar datos
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h2 className="font-display text-sm uppercase text-white">
          Convenio de tarifa
        </h2>
        <div className="mt-4">
          <TarifaForm
            tipoActual={mentor.tipoTarifa}
            valores={{
              presencialTitular: buscarValor("presencial", "titular"),
              presencialAcompanante: buscarValor("presencial", "acompanante"),
              virtualTitular: buscarValor("virtual", "titular"),
              virtualAcompanante: buscarValor("virtual", "acompanante"),
            }}
            action={guardarTarifa.bind(null, mentor.id)}
          />
        </div>
      </div>

      {historial.length > 0 && (
        <div>
          <h2 className="font-display text-sm uppercase text-white">
            Historial de tarifas
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-dc-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dc-line text-left text-xs text-dc-muted">
                  <th className="px-4 py-2 font-normal">Modalidad</th>
                  <th className="px-4 py-2 font-normal">Rol</th>
                  <th className="px-4 py-2 font-normal">Valor USD</th>
                  <th className="px-4 py-2 font-normal">Vigencia</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((t) => (
                  <tr key={t.id} className="border-b border-dc-line last:border-0 text-dc-muted">
                    <td className="px-4 py-2">{ETIQUETA_MODALIDAD[t.modalidad]}</td>
                    <td className="px-4 py-2">{ETIQUETA_ROL[t.rol]}</td>
                    <td className="px-4 py-2">{Number(t.valorUsd).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      {t.vigenteDesde.toLocaleDateString("es-AR")} –{" "}
                      {t.vigenteHasta?.toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
