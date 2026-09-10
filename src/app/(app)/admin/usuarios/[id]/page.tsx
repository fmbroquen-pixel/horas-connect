import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPerfilUsuario, tieneTarifa, valorVigente } from "@/lib/perfil-usuario";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, guardarTarifa, alternarActivoUsuario } from "../actions";
import { SwitchEstado } from "@/components/ui/switch-estado";
import {
  GuardadoPaginaProvider,
  BotonGuardarPagina,
} from "@/components/guardado-pagina";
import { GuardiaCambios } from "@/components/guardia-cambios";
import { TarifaForm } from "./tarifa-form";
import { ProyectosForm } from "./proyectos-form";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";
import { SeccionPerfil } from "@/components/perfil/seccion-perfil";
import { MAX_BACKUPS } from "../constantes";

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  // Los datos del perfil salen de una sola fuente, compartida con Mi perfil:
  // las dos pantallas muestran lo mismo y solo cambia quién puede tocarlo.
  const perfil = await getPerfilUsuario(id, usuario.rol);
  const puedeTarifa = tieneTarifa(usuario.rol);
  // Todos los roles reciben proyectos asignados: guest y admin para limitar
  // dónde cargan horas; reader para acotar qué rentabilidad puede ver.
  const asignaProyectos = true;

  return (
    // Las tres cards ceden su boton al del pie; el provider es lo que las junta,
    // y la guardia avisa si alguien se va con algo sin guardar.
    <GuardadoPaginaProvider>
    <div className="space-y-8 pb-4">
      <GuardiaCambios />
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver a Usuarios
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-lg uppercase text-white">
            {usuario.nombre}
          </h1>
          {/* Único lugar donde se cambia el estado: en la tabla es solo tag
              informativo. */}
          <SwitchEstado
            activo={usuario.activo}
            entidad="Usuario"
            etiquetaInactivo="Bloqueado"
            alternar={alternarActivoUsuario.bind(null, id)}
          />
        </div>
      </div>

      <SeccionDatosUsuario
        titulo={admin.id === usuario.id ? "Mis datos" : "Datos del usuario"}
        soloLectura={false}
        usuario={usuario}
        action={actualizarUsuario.bind(null, usuario.id)}
      />

      {puedeTarifa && (
        <SeccionPerfil titulo="Convenio de tarifa">
          <TarifaForm
              tipoActual={usuario.tipoTarifa}
            valores={{
              presencialOwner: valorVigente(perfil.vigentes, "presencial", "owner"),
              presencialBackup: valorVigente(perfil.vigentes, "presencial", "backup"),
              virtualOwner: valorVigente(perfil.vigentes, "virtual", "owner"),
              virtualBackup: valorVigente(perfil.vigentes, "virtual", "backup"),
            }}
            vigenteDesdeActual={perfil.vigenteDesdeActual}
            action={guardarTarifa.bind(null, usuario.id)}
          />
        </SeccionPerfil>
      )}

      {/* La última sección editable y el Guardar van juntos, con poco aire
          entre ellos: son un grupo, no dos bloques sueltos. El space-y-8 de
          afuera sigue separando ese grupo del historial. */}
      <div className="space-y-3">
      {asignaProyectos && (
        <SeccionPerfil
          titulo="Clientes asignados"
          descripcion={
            usuario.rol === "reader"
              ? "Limitan qué clientes puede ver en el informe de rentabilidad."
              : `Limitan en qué clientes puede cargar horas y con qué rol. Cada proyecto tiene un único Mentor Owner y hasta ${MAX_BACKUPS} Backup.`
          }
        >
          <ProyectosForm usuarioId={usuario.id} proyectos={perfil.proyectos} />
        </SeccionPerfil>
      )}

      {/* Guardar cierra el formulario, así que va acá y no al final de la
          página: abajo está el historial de tarifas, que es solo lectura, y con
          una tabla entera en el medio el botón se leía como una acción suelta
          al fondo en vez del cierre de lo que se estaba editando. Queda fuera
          de las cards y alineado con su borde derecho. */}
      <BotonGuardarPagina />
      </div>

      {/* pb-4 al final de la sección: sin esto el historial queda pegado al
          borde del área scrolleable y contra la barra de scroll. Es el cierre
          visual de la pantalla, no espacio de más: son 16px, no un salto. */}
      {puedeTarifa && (
        <HistorialTarifas historial={perfil.historial} />
      )}
    </div>
    </GuardadoPaginaProvider>
  );
}
