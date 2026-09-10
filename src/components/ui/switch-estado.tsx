"use client";

import { useState, useTransition } from "react";
import { avisarError, avisarOk } from "@/components/ui/avisos";

export type ResultadoEstado = { ok?: true; error?: string };

// El interruptor que activa o inactiva un registro. Uno solo para Clientes,
// Usuarios y Conceptos, en la tabla y en el detalle.
//
// Antes era una pastilla que decía "Activo"/"Inactivo" y solo se podía tocar
// en el detalle; en las tablas el mismo dibujo era informativo. Dos problemas:
// el estado y la acción se leían igual —una pastilla que dice "Activo" tanto
// puede significar "está activo" como "tocá para activar"— y cambiarlo obligaba
// a entrar a la ficha. Un interruptor no tiene esa ambigüedad: la posición ES
// el estado y tocarlo ES la acción.
//
// Optimista: la posición cambia en el acto y el servidor confirma después. Si
// rechaza -desactivar al único admin, por ejemplo- vuelve y lo dice. Es un
// cambio de una fila, así que esperar el viaje entero para mover un
// interruptor se siente roto.
export function SwitchEstado({
  activo,
  entidad,
  etiquetaActivo = "Activo",
  etiquetaInactivo = "Inactivo",
  alternar,
  conEtiqueta = true,
}: {
  activo: boolean;
  // Cómo se llama esto en el aviso: "Cliente inactivado", "Concepto activado".
  entidad: string;
  // Qué dice cada posición. Usuarios dice "Bloqueado" donde Clientes dice
  // "Inactivo", y eso es del dominio, no del componente.
  etiquetaActivo?: string;
  etiquetaInactivo?: string;
  alternar: (activo: boolean) => Promise<ResultadoEstado>;
  // En una tabla angosta el texto al lado sobra: la posición y el color ya
  // dicen todo, y el nombre del estado sigue estando en el aria-label.
  conEtiqueta?: boolean;
}) {
  const [optimista, setOptimista] = useState(activo);
  const [pendiente, start] = useTransition();

  // La prop manda cuando llega el render nuevo del servidor: si no, después de
  // una revalidación el interruptor se quedaría con lo que dejó el último clic.
  const [ultimaProp, setUltimaProp] = useState(activo);
  if (activo !== ultimaProp) {
    setUltimaProp(activo);
    setOptimista(activo);
  }

  const alClic = () => {
    const objetivo = !optimista;
    setOptimista(objetivo);
    start(async () => {
      const r = await alternar(objetivo);
      if (r?.error) {
        setOptimista(!objetivo); // Se deshace: el cambio no ocurrió.
        avisarError(r.error);
        return;
      }
      avisarOk(`${entidad} ${objetivo ? "activado" : "inactivado"}`);
    });
  };

  const estado = optimista ? etiquetaActivo : etiquetaInactivo;
  // El tooltip dice qué va a PASAR, no en qué estado está: el estado ya se lee
  // en la posición del interruptor, y repetirlo al pasar el mouse no agrega
  // nada.
  const accion = optimista ? "Inactivar" : "Activar";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={optimista}
        onClick={alClic}
        disabled={pendiente}
        data-tooltip={accion}
        aria-label={`${entidad}: ${estado}. ${accion}.`}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 disabled:opacity-60 ${
          optimista ? "bg-dc-peri/70" : "bg-dc-line"
        }`}
      >
        {/* El bolita se mueve con transform y no con left: así la animación
            corre en el compositor y no obliga a recalcular el layout de la
            fila en cada cuadro. */}
        <span
          aria-hidden
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-150 ${
            optimista ? "translate-x-[1.125rem]" : "translate-x-[0.1875rem]"
          }`}
        />
      </button>
      {conEtiqueta && (
        <span
          className={`text-xs ${optimista ? "text-dc-peri" : "text-dc-muted"}`}
        >
          {estado}
        </span>
      )}
    </span>
  );
}
