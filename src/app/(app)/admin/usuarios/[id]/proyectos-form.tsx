"use client";

import { useActionState, useState } from "react";
import { guardarProyectosAsignados } from "../actions";
import {
  MAX_BACKUPS,
  type ProyectoAsignable,
  type RolAsignacion,
} from "../constantes";
import { avisarOk } from "@/components/ui/avisos";
import { Modal } from "@/components/ui/modal";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { useSeccionGuardable } from "@/components/guardado-pagina";

const SOLAPAS: { rol: RolAsignacion; label: string }[] = [
  { rol: "owner", label: "Mentor Owner" },
  { rol: "backup", label: "Mentor Backup" },
];

// Asignación de proyectos por rol. Las dos solapas comparten un único estado
// y un único submit: son dos vistas de la misma decisión (qué rol tiene este
// usuario en cada proyecto), no dos formularios independientes.
//
// Las reglas —un owner por proyecto, hasta MAX_BACKUPS backups, nadie en los dos
// roles— se bloquean acá para que el problema se vea antes de guardar, y se
// vuelven a validar en el servidor: deshabilitar un checkbox no impide que
// alguien mande el dato igual.
export function ProyectosForm({
  usuarioId,
  proyectos,
}: {
  usuarioId: string;
  proyectos: ProyectoAsignable[];
}) {
  const [solapa, setSolapa] = useState<RolAsignacion>("owner");
  const [roles, setRoles] = useState<Map<string, RolAsignacion>>(
    () =>
      new Map(
        proyectos
          .filter((p) => p.rolPropio !== "")
          .map((p) => [p.id, p.rolPropio as RolAsignacion]),
      ),
  );
  // Contador y no booleano: dos guardados seguidos tienen que pulsar dos veces.
  const [exito, setExito] = useState(0);
  // Proyectos que el admin confirmó quitarle a su Owner actual. Viajan al
  // servidor: sin esta lista, un formulario viejo podría desplazar a alguien
  // que se convirtió en Owner después de que se abrió la pantalla.
  const [desplazar, setDesplazar] = useState<Set<string>>(new Set());
  // El proyecto que está esperando confirmación, o null.
  const [aConfirmar, setAConfirmar] = useState<ProyectoAsignable | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean } | undefined, fd: FormData) => {
      const r = await guardarProyectosAsignados(usuarioId, prev, fd);
      if (r.ok) {
        avisarOk("Asignaciones guardadas");
        setExito((n) => n + 1);
        // El reemplazo ya se aplicó; volver a mandarlo en el próximo guardado
        // desplazaría a quien haya quedado como Owner desde entonces.
        setDesplazar(new Set());
      }
      return r;
    },
    undefined,
  );

  // Marcar en una solapa desmarca la otra: un usuario tiene un solo rol por
  // proyecto, así que la exclusión es automática y no un error a mostrar.
  const alternar = (id: string, rol: RolAsignacion) => {
    setRoles((m) => {
      const n = new Map(m);
      if (n.get(id) === rol) n.delete(id);
      else n.set(id, rol);
      return n;
    });
    // Soltar el proyecto cancela el desplazamiento: si no queda marcado como
    // Owner, no hay a quién reemplazar.
    setDesplazar((d) => {
      if (!d.has(id)) return d;
      const n = new Set(d);
      n.delete(id);
      return n;
    });
  };

  // Un clic en la solapa Owner sobre un proyecto que ya tiene otro Owner no se
  // bloquea: se pregunta. Antes el checkbox estaba deshabilitado, y como un
  // mismo admin figuraba como Owner de todos los proyectos, la solapa se veía
  // entera en gris sin ninguna pista de que la salida era ir a la ficha del
  // otro usuario a soltarlos uno por uno.
  const alClickear = (p: ProyectoAsignable) => {
    const yaMarcado = roles.get(p.id) === solapa;
    if (solapa === "owner" && p.ownerAjeno && !yaMarcado) {
      setAConfirmar(p);
      return;
    }
    alternar(p.id, solapa);
  };

  // Confirmar guarda. Antes solo dejaba el proyecto marcado y había que
  // acordarse de apretar Guardar abajo: se confirmaba un cambio fuerte -alguien
  // pierde un proyecto- y no pasaba nada visible, así que no quedaba claro si
  // se habia aplicado.
  //
  // El FormData se arma a mano y no se deja que el form lea sus inputs: los
  // hidden se renderizan recién en el próximo render, y para entonces el
  // submit ya salió. Acá se manda el estado que va a quedar.
  //
  // Se guarda TODO lo pendiente, no solo el proyecto confirmado: es un único
  // formulario y partirlo en dos escrituras dejaría al usuario sin saber cuál
  // de sus marcas quedó.
  // El FormData de esta seccion. Se arma a mano y no se lee del <form>: los
  // hidden se renderizan recien en el proximo render, y tanto el guardado del
  // pie como la confirmacion de reemplazo necesitan el estado que va a quedar.
  const armarDatos = (
    r: Map<string, RolAsignacion> = roles,
    d: Set<string> = desplazar,
  ) => {
    const fd = new FormData();
    for (const [clienteId, rol] of r) fd.append(rol, clienteId);
    for (const clienteId of d) {
      if (r.get(clienteId) === "owner") fd.append("desplazarOwner", clienteId);
    }
    return fd;
  };

  // Sucia si la asignacion difiere de la que vino del servidor.
  const inicial = new Map(
    proyectos.filter((p) => p.rolPropio !== "").map((p) => [p.id, p.rolPropio]),
  );
  const sucio =
    roles.size !== inicial.size ||
    [...roles].some(([id, rol]) => inicial.get(id) !== rol);

  const coordinado = useSeccionGuardable(
    "proyectos",
    "Clientes asignados",
    sucio,
    async () => {
      const r = await guardarProyectosAsignados(usuarioId, undefined, armarDatos());
      if (r.error) return { error: r.error };
      setDesplazar(new Set());
      setExito((n) => n + 1);
      avisarOk("Asignaciones guardadas");
    },
  );

  const confirmarCambio = () => {
    if (!aConfirmar) return;
    const id = aConfirmar.id;

    const nuevosRoles = new Map(roles).set(id, "owner" as RolAsignacion);
    const nuevosDesplazar = new Set(desplazar).add(id);
    setRoles(nuevosRoles);
    setDesplazar(nuevosDesplazar);
    setAConfirmar(null);

    formAction(armarDatos(nuevosRoles, nuevosDesplazar));
  };

  // Quién ocupa hoy el rol, para mostrarlo debajo del nombre. En Owner es
  // informativo —se puede reemplazar— y en Backup es además el motivo por el
  // que el proyecto no se puede tomar: ahí el cupo es un tope, no un titular.
  const ocupacion = (p: ProyectoAsignable, rol: RolAsignacion): string | null => {
    if (rol === "owner") {
      return p.ownerAjeno ? `Owner: ${p.ownerAjeno}` : null;
    }
    const cupo = MAX_BACKUPS - p.backupsAjenos.length;
    return cupo <= 0 ? `Backups completos: ${p.backupsAjenos.join(", ")}` : null;
  };

  const contar = (rol: RolAsignacion) =>
    [...roles.values()].filter((r) => r === rol).length;

  const sinRol = proyectos.filter((p) => p.sinRol && !roles.has(p.id));

  return (
    <form action={formAction}>
      {/* La solapa inactiva no está en el DOM, así que lo elegido se serializa
          acá: el submit manda las dos listas completas de una sola vez. */}
      {[...roles.entries()].map(([clienteId, rol]) => (
        <input key={clienteId} type="hidden" name={rol} value={clienteId} />
      ))}
      {/* Los reemplazos confirmados van aparte del rol: el servidor solo saca
          a un Owner de un proyecto que aparezca acá. */}
      {[...desplazar]
        .filter((id) => roles.get(id) === "owner")
        .map((clienteId) => (
          <input
            key={`d-${clienteId}`}
            type="hidden"
            name="desplazarOwner"
            value={clienteId}
          />
        ))}

      <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-dc-line bg-dc-deeper p-1">
        {SOLAPAS.map((s) => {
          const activa = s.rol === solapa;
          return (
            <button
              key={s.rol}
              type="button"
              onClick={() => setSolapa(s.rol)}
              aria-pressed={activa}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                activa
                  ? "bg-dc-peri/20 text-dc-text"
                  : "text-dc-muted hover:text-dc-text"
              }`}
            >
              {s.label} ({contar(s.rol)})
            </button>
          );
        })}
      </div>

      {sinRol.length > 0 && (
        <p className="mb-3 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-3 py-2 text-xs text-dc-text">
          {sinRol.length} proyecto(s) asignados antes de que existieran los
          roles: {sinRol.map((p) => p.nombre).join(", ")}. Conservan el permiso
          de cargar horas; elegiles una solapa para completarlos.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((p) => {
          const propio = roles.get(p.id);
          const marcado = propio === solapa;
          const motivo = ocupacion(p, solapa);
          // Solo Backup bloquea: en Owner el titular actual se reemplaza.
          const deshabilitado = solapa === "backup" && motivo !== null && !marcado;

          return (
            // Card entera clickeable, sin checkbox. El área que se puede tocar
            // pasa de un cuadrito de 16px a toda la tarjeta, y el check de
            // arriba a la derecha es feedback: no es un control, no se puede
            // tocar por separado ni recibe foco propio.
            //
            // <button> y no <label>: sin checkbox adentro no hay nada que
            // etiquetar, y un botón ya trae el foco, el Enter y la barra
            // espaciadora sin que haya que agregarlos.
            <button
              key={p.id}
              type="button"
              onClick={() => alClickear(p)}
              disabled={deshabilitado}
              aria-pressed={marcado}
              data-tooltip={motivo ?? undefined}
              className={`relative w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                deshabilitado
                  ? "cursor-not-allowed border-dc-line/60 text-dc-muted opacity-50"
                  : marcado
                    ? "border-dc-peri bg-dc-peri/12 text-dc-text shadow-[0_0_0_1px_rgba(139,140,255,0.35),0_0_14px_rgba(139,140,255,0.18)]"
                    : "border-dc-line text-dc-text hover:border-dc-peri/60 hover:bg-dc-line/25"
              }`}
            >
              {marcado && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 text-dc-green [filter:drop-shadow(0_0_5px_rgba(52,211,153,0.55))]"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              )}
              {/* pr-6 siempre y no solo cuando está marcado: si el hueco del
                  check apareciera al seleccionar, el nombre se reacomodaría en
                  el mismo gesto que lo elige. */}
              <span className="block truncate pr-6">{p.nombre}</span>
              {/* La segunda línea se dibuja siempre, con o sin contenido: es lo
                  que hace que todas las cards midan igual sin depender de si el
                  proyecto tiene owner. El &nbsp; reserva el alto de la línea. */}
              <span className="mt-0.5 block truncate text-[11px] text-dc-peri">
                {p.ownerAjeno ? `Owner: ${p.ownerAjeno}` : " "}
              </span>
            </button>
          );
        })}

        {proyectos.length === 0 && (
          <p className="text-sm text-dc-muted">No hay proyectos activos.</p>
        )}
      </div>

      {state?.error && (
        <p className="mt-3 text-xs text-dc-pink" role="alert">
          {state.error}
        </p>
      )}

      {!coordinado && (
        <div className="mt-4 flex justify-end">
          <BotonGuardarIcono
            pending={pending}
            label="Guardar clientes asignados"
            exito={exito}
          />
        </div>
      )}


      {/* El reemplazo se avisa antes de tocar nada, y nombra a quien lo
          pierde: es la única acción de esta pantalla que le saca un proyecto a
          otra persona. Nada se escribe hasta Guardar, así que Cancelar acá
          simplemente no marca el proyecto. */}
      <Modal
        open={aConfirmar !== null}
        onClose={() => setAConfirmar(null)}
        labelledBy="titulo-cambio-owner"
      >
        <div className="w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-cambio-owner"
            className="font-display text-sm uppercase text-white"
          >
            Cambiar Mentor Owner
          </h2>
          <p className="mt-3 text-sm text-dc-text">
            Si continuás,{" "}
            <strong className="text-white">{aConfirmar?.ownerAjeno}</strong>{" "}
            dejará de ser Owner y perderá acceso al proyecto. ¿Deseás
            continuar?
          </p>
          {/* El overlay tapa la fila desde la que se abrió, así que el nombre
              del proyecto va acá: es lo que evita confirmar sobre el que no
              era. */}
          <p className="mt-2 text-xs text-dc-muted">
            Proyecto: {aConfirmar?.nombre}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAConfirmar(null)}
              className={BTN_SECONDARY}
            >
              Cancelar
            </button>
            {/* type="button": dentro del form, un submit acá guardaría todo en
                vez de solo marcar el proyecto. */}
            <button type="button" onClick={confirmarCambio} className={BTN_PRIMARY}>
              Confirmar cambio
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
