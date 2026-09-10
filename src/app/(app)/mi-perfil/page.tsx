import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { getPerfilUsuario, tieneTarifa, valorVigente } from "@/lib/perfil-usuario";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";
import { SeccionPerfil } from "@/components/perfil/seccion-perfil";
import { TarifaForm } from "@/app/(app)/admin/usuarios/[id]/tarifa-form";
import { ProyectosForm } from "@/app/(app)/admin/usuarios/[id]/proyectos-form";
import { MAX_BACKUPS } from "@/app/(app)/admin/usuarios/constantes";

// El perfil propio, de solo lectura.
//
// Muestra EXACTAMENTE lo mismo que ve un admin en Settings → Usuarios, con los
// mismos componentes y en el mismo orden: sus datos, su convenio de tarifa, sus
// clientes asignados con el rol que tiene en cada uno, y el historial. Lo único
// que cambia es que nada se puede tocar.
//
// Antes esta pantalla tenía su propia versión de cada bloque —otra grilla para
// la tarifa, pastillas sueltas en vez de las cards de clientes— y el mentor
// terminaba viendo menos información que la que un admin veía de él: no podía
// saber en qué proyectos era Owner y en cuáles Backup.
export default async function MiPerfilPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const usuario = sesion.usuario;
  // El admin gestiona todo desde Settings, y ahí ve su propio perfil editable.
  // Guest y reader entran acá: los dos tienen clientes asignados que mirar.
  if (usuario.rol === "admin") redirect("/admin/usuarios");

  const perfil = await getPerfilUsuario(usuario.id, usuario.rol);
  const conTarifa = tieneTarifa(usuario.rol);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-xs tracking-[0.3em] text-dc-pink">SETTINGS</p>
        <h1 className="mt-1 font-display text-lg uppercase text-white">Mi perfil</h1>
      </div>

      <SeccionDatosUsuario titulo="Mis datos" soloLectura usuario={usuario} />

      {conTarifa && (
        <SeccionPerfil
          titulo="Convenio de tarifa"
          soloLectura
          descripcion={
            <>
              Solo un administrador puede modificarlo
              {perfil.adminsEmails.length > 0 && (
                <>
                  . Si necesitás un cambio, escribile a{" "}
                  {perfil.adminsEmails.map((email, i) => (
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
          }
        >
          <TarifaForm
            soloLectura
            tipoActual={usuario.tipoTarifa}
            valores={{
              presencialOwner: valorVigente(perfil.vigentes, "presencial", "owner"),
              presencialBackup: valorVigente(perfil.vigentes, "presencial", "backup"),
              virtualOwner: valorVigente(perfil.vigentes, "virtual", "owner"),
              virtualBackup: valorVigente(perfil.vigentes, "virtual", "backup"),
            }}
            vigenteDesdeActual={perfil.vigenteDesdeActual}
          />
        </SeccionPerfil>
      )}

      <SeccionPerfil
        titulo="Clientes asignados"
        soloLectura
        descripcion={
          usuario.rol === "reader"
            ? "Limitan qué clientes podés ver en el informe de rentabilidad. Los gestiona un administrador."
            : `Limitan en qué clientes podés cargar horas y con qué rol. Cada proyecto tiene un único Mentor Owner y hasta ${MAX_BACKUPS} Backup. Los gestiona un administrador.`
        }
      >
        <ProyectosForm soloLectura usuarioId={usuario.id} proyectos={perfil.proyectos} />
      </SeccionPerfil>

      {conTarifa && <HistorialTarifas historial={perfil.historial} />}
    </div>
  );
}
