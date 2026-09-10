"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarEtapaActual } from "../proyectos/actions";
import type { CierreEtapa } from "../proyectos/actions";
import { TagPopover, type OpcionTag } from "./tag-popover";
import { CambioEtapaModal } from "./cambio-etapa-modal";
import { SelectorSemaforo } from "../proyectos/selector-semaforo";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";
import { LINK_FILA } from "@/lib/ui";

// Fila de la lista ejecutiva "Estado de Proyectos": tres columnas
// equivalentes (1/3 cada una: min-w-0 flex-1, igual que el header en
// estado-proyectos.tsx), con el contenido centrado dentro de cada una.
// El semáforo es el SelectorSemaforo compartido con el Home del proyecto; la
// etapa, un TagPopover con su modal de cierre.
export function FilaProyectoEstado({
  id,
  nombre,
  semaforo,
  etapaId: etapaIdInicial,
  etapas,
  activo,
}: {
  id: string;
  nombre: string;
  semaforo: string;
  etapaId: string;
  etapas: OpcionTag[];
  // Un proyecto inactivo sigue apareciendo acá cuando se mira un mes en el que
  // operaba —para eso se guarda la fecha de inactivación—, pero se mira, no se
  // toca: cambiarle el semáforo o la etapa escribe una fila nueva sobre un
  // cliente que dejó de operar.
  activo: boolean;
}) {
  const [guardando, start] = useTransition();
  const [etapaId, setEtapaId] = useState(etapaIdInicial);
  // Etapa elegida esperando confirmación en el modal.
  const [porConfirmar, setPorConfirmar] = useState<OpcionTag | null>(null);
  const [errorEtapa, setErrorEtapa] = useState<string>();

  // El estado local no se toca hasta que el servidor confirma: las dos
  // escrituras van en una transacción y, si falla, en la base no cambió nada.
  // Adelantarlo dejaría a la vista una etapa que no existe.
  const aplicarEtapa = (valor: string, cierre: CierreEtapa) => {
    start(async () => {
      const r = await marcarEtapaActual(id, valor, cierre);
      if (r?.error) {
        setErrorEtapa(r.error);
        return;
      }
      setEtapaId(valor);
      setPorConfirmar(null);
    });
  };

  // Elegir la etapa marca esa tarea del Roadmap como "en curso": el Home no
  // guarda un estado propio, escribe sobre el mismo plan que se ve en
  // Follow Up. Como además hay que cerrar la que estaba en curso —y con cuál
  // de los tres estados no se puede adivinar desde acá— la elección abre un
  // modal en vez de guardar en el acto.
  const elegirEtapa = (valor: string) => {
    if (valor === etapaId) return;
    const nueva = etapas.find((e) => e.value === valor);
    if (!nueva) return;
    setErrorEtapa(undefined);
    // Sin etapa en curso no hay nada que cerrar: se aplica derecho.
    if (!etapaId) {
      aplicarEtapa(valor, "sin_iniciar");
      return;
    }
    setPorConfirmar(nueva);
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Columna 1/3: el proyecto NAVEGA, así que usa el patrón de fila
          navegable y no el de selector: texto limpio en reposo, y el área
          -la columna entera- se revela al pasar o al llegar con el teclado. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <Link
          href={`/proyectos/${id}`}
          className={`${LINK_FILA} flex w-full min-w-0 justify-center px-2 py-1.5 text-sm font-semibold text-dc-text hover:text-white`}
        >
          <span className="truncate">{nombre}</span>
        </Link>
      </div>
      {/* Columna 2/3: el semáforo es solo el punto. Ya no necesita el ancho de
          una pastilla, así que se centra en la columna sin caja alrededor. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <SelectorSemaforo
          clienteId={id}
          nombre={nombre}
          semaforo={semaforo}
          activo={activo}
        />
      </div>
      {/* Columna 3/3: la etapa ELIGE, así que es una pastilla selector con
          el ancho acotado de siempre. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="w-full max-w-[13rem]">
          <TagPopover
            valor={etapaId}
            opciones={etapas}
            placeholder="Sin etapa"
            onElegir={elegirEtapa}
            ariaLabel={`Etapa de ${nombre}`}
            tooltip="Cambiar etapa actual"
            anchoMenu="w-56"
            soloLectura={!activo}
            motivoSoloLectura={MOTIVO_INACTIVO}
          />
        </div>
      </div>

      <CambioEtapaModal
        abierto={porConfirmar !== null}
        proyecto={nombre}
        etapaActual={etapas.find((e) => e.value === etapaId)?.label ?? "La etapa actual"}
        etapaNueva={porConfirmar?.label ?? ""}
        guardando={guardando}
        error={errorEtapa}
        onCancelar={() => {
          setPorConfirmar(null);
          setErrorEtapa(undefined);
        }}
        onConfirmar={(cierre) => {
          if (porConfirmar) aplicarEtapa(porConfirmar.value, cierre);
        }}
      />
    </div>
  );
}
