import Link from "next/link";
import type { ComponentProps } from "react";
import type { Usuario } from "@/generated/prisma/client";
import { tieneTarifa, valorVigente, type PerfilUsuario } from "@/lib/perfil-usuario";
import { SwitchEstado } from "@/components/ui/switch-estado";
import {
  GuardadoPaginaProvider,
  BotonGuardarPagina,
} from "@/components/guardado-pagina";
import { GuardiaCambios } from "@/components/guardia-cambios";
import { TarifaForm } from "@/app/(app)/admin/usuarios/[id]/tarifa-form";
import { ProyectosForm } from "@/app/(app)/admin/usuarios/[id]/proyectos-form";
import { MAX_BACKUPS } from "@/app/(app)/admin/usuarios/constantes";
import { HistorialTarifas } from "./historial-tarifas";
import { SeccionDatosUsuario } from "./seccion-datos";
import { SeccionPerfil } from "./seccion-perfil";

// Lo que hace falta para editar un perfil. Viene armado por quien tiene
// permiso -hoy, el detalle de Settings → Usuarios del admin- y no llega nunca
// a Mi perfil: sin acciones no hay forma de guardar, así que la solo lectura no
// depende de acordarse de apagar cada botón.
export type EdicionPerfil = {
  actualizarUsuario: NonNullable<ComponentProps<typeof SeccionDatosUsuario>["action"]>;
  guardarTarifa: NonNullable<ComponentProps<typeof TarifaForm>["action"]>;
  alternarActivo: ComponentProps<typeof SwitchEstado>["alternar"];
};

// EL perfil de un usuario, para cualquier rol que lo mire.
//
// Settings → Usuarios (admin) y Mi perfil (mentor y reader) son la misma
// pantalla vista por dos personas distintas, así que se dibujan acá, una sola
// vez: misma cabecera, mismas secciones en el mismo orden, mismo espaciado y el
// mismo historial. Antes cada página armaba su propio layout con los mismos
// componentes, y las dos se fueron separando -el Guardar agrupaba las cards de
// una manera en una y de otra en la otra, el historial no cerraba igual-.
//
// Lo único que cambia es el permiso, y entra como dato: con `edicion` es
// editable; sin ella, todo es solo lectura. No hay ramas por rol.
export function VistaPerfil({
  usuario,
  perfil,
  propio,
  volver,
  edicion,
}: {
  usuario: Usuario;
  perfil: PerfilUsuario;
  // Si quien mira es el dueño del perfil: cambia el texto ("Mis datos",
  // "podés"), no la estructura.
  propio: boolean;
  // A dónde vuelve la cabecera. Solo cuando el perfil se abrió desde un
  // listado; el perfil propio no tiene un listado detrás.
  volver?: { href: string; label: string };
  edicion?: EdicionPerfil;
}) {
  const soloLectura = !edicion;
  const conTarifa = tieneTarifa(usuario.rol);

  const contenido = (
    // pb-4 cierra la pantalla: sin esto el historial queda contra el borde del
    // área scrolleable.
    <div className="space-y-8 pb-4">
      {edicion && <GuardiaCambios />}

      <div>
        {volver && (
          <Link
            href={volver.href}
            className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {volver.label}
          </Link>
        )}
        <div className={`flex flex-wrap items-center gap-3 ${volver ? "mt-2" : ""}`}>
          <h1 className="font-display text-lg uppercase text-white">{usuario.nombre}</h1>
          {/* El estado se cambia solo con permiso de edición. */}
          {edicion && (
            <SwitchEstado
              activo={usuario.activo}
              entidad="Usuario"
              etiquetaInactivo="Bloqueado"
              alternar={edicion.alternarActivo}
            />
          )}
        </div>
      </div>

      <SeccionDatosUsuario
        titulo={propio ? "Mis datos" : "Datos del usuario"}
        soloLectura={soloLectura}
        usuario={usuario}
        action={edicion?.actualizarUsuario}
      />

      {conTarifa && (
        <SeccionPerfil
          titulo="Convenio de tarifa"
          soloLectura={soloLectura}
          descripcion={soloLectura ? <AvisoSoloAdmin emails={perfil.adminsEmails} /> : undefined}
        >
          <TarifaForm
            soloLectura={soloLectura}
            tipoActual={usuario.tipoTarifa}
            valores={{
              presencialOwner: valorVigente(perfil.vigentes, "presencial", "owner"),
              presencialBackup: valorVigente(perfil.vigentes, "presencial", "backup"),
              virtualOwner: valorVigente(perfil.vigentes, "virtual", "owner"),
              virtualBackup: valorVigente(perfil.vigentes, "virtual", "backup"),
            }}
            vigenteDesdeActual={perfil.vigenteDesdeActual}
            action={edicion?.guardarTarifa}
          />
        </SeccionPerfil>
      )}

      {/* Clientes asignados y el Guardar van juntos, con poco aire entre ellos:
          el botón cierra lo que se estaba editando. El grupo existe también en
          solo lectura -con una sola card adentro- para que el historial quede
          exactamente a la misma distancia en todos los perfiles. */}
      <div className="space-y-3">
        <SeccionPerfil
          titulo="Clientes asignados"
          soloLectura={soloLectura}
          descripcion={descripcionClientes(usuario.rol, propio, soloLectura)}
        >
          <ProyectosForm
            soloLectura={soloLectura}
            usuarioId={usuario.id}
            proyectos={perfil.proyectos}
          />
        </SeccionPerfil>
        {edicion && <BotonGuardarPagina />}
      </div>

      {conTarifa && <HistorialTarifas historial={perfil.historial} />}
    </div>
  );

  // Coordinar el guardado solo tiene sentido cuando hay algo que guardar.
  return edicion ? <GuardadoPaginaProvider>{contenido}</GuardadoPaginaProvider> : contenido;
}

// Para qué sirven las asignaciones. Depende del rol del usuario del perfil
// -un reader no carga horas- y de quién lo lee, no de cómo se dibuja.
function descripcionClientes(rol: string, propio: boolean, soloLectura: boolean): string {
  const base =
    rol === "reader"
      ? `Limitan qué clientes ${propio ? "podés" : "puede"} ver en el informe de rentabilidad.`
      : `Limitan en qué clientes ${propio ? "podés" : "puede"} cargar horas y con qué rol. Cada proyecto tiene un único Mentor Owner y hasta ${MAX_BACKUPS} Backup.`;
  return soloLectura ? `${base} Los gestiona un administrador.` : base;
}

// A quién pedirle un cambio de tarifa, cuando no se puede hacer uno mismo.
function AvisoSoloAdmin({ emails }: { emails: string[] }) {
  return (
    <>
      Solo un administrador puede modificarlo
      {emails.length > 0 && (
        <>
          . Si necesitás un cambio, escribile a{" "}
          {emails.map((email, i) => (
            <span key={email}>
              {i > 0 && ", "}
              <a
                href={`mailto:${email}`}
                className="text-dc-peri underline-offset-2 hover:underline"
              >
                {email}
              </a>
            </span>
          ))}
        </>
      )}
      .
    </>
  );
}
