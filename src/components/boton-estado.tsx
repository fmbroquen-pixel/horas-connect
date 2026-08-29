"use client";

import { useState, useTransition } from "react";
import { avisarError, avisarOk } from "@/components/ui/avisos";
import { BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

export type ResultadoEstado = { ok?: true; error?: string };

// La pastilla que activa o inactiva un registro, con su confirmación.
//
// Es una sola para Usuarios y Clientes: antes cada pantalla tenía su propio
// <form> con un submit pelado, así que el cambio se aplicaba sin decir nada y
// un fallo —desactivar al único admin— llegaba como una pantalla rota en vez de
// como una explicación.
//
// El estado se pinta desde `activo` local y no desde la prop: la revalidación
// del servidor tarda su viaje, y en ese rato la pastilla mostraría todavía el
// estado viejo aunque el cambio ya esté hecho. Si el servidor rechaza, vuelve.
export function BotonEstado({
  activo,
  entidad,
  etiquetaActivo,
  etiquetaInactivo,
  alternar,
}: {
  activo: boolean;
  // Cómo se llama esto en el aviso: "Usuario activado", "Cliente inactivado".
  entidad: "Usuario" | "Cliente";
  // Qué dice la pastilla en cada estado. Usuarios dice "Bloqueado" donde
  // Clientes dice "Inactivo", y eso es del dominio, no del componente.
  etiquetaActivo: string;
  etiquetaInactivo: string;
  alternar: (activo: boolean) => Promise<ResultadoEstado>;
}) {
  const [optimista, setOptimista] = useState(activo);
  const [pendiente, start] = useTransition();

  // La prop manda cuando llega el render nuevo del servidor: si no, después de
  // una revalidación la pastilla se quedaría con lo que dejó el último clic.
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

  // El tooltip dice qué va a PASAR, no en qué estado está: el estado ya se lee
  // en la propia pastilla, y repetirlo al pasar el mouse no agrega nada.
  const accion = optimista ? "Inactivar" : "Activar";

  return (
    <button
      type="button"
      onClick={alClic}
      disabled={pendiente}
      title={accion}
      aria-label={`${accion} ${entidad.toLowerCase()}`}
      aria-pressed={optimista}
      className={`${optimista ? BTN_PILL_ON : BTN_PILL_OFF} disabled:opacity-60`}
    >
      {optimista ? etiquetaActivo : etiquetaInactivo}
    </button>
  );
}
