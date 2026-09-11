import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { getPerfilUsuario } from "@/lib/perfil-usuario";
import { VistaPerfil } from "@/components/perfil/vista-perfil";

// El perfil propio de mentor y reader: la pestaña Usuario de su Settings.
//
// Es la misma pantalla que ve un admin en Settings → Usuarios (VistaPerfil),
// en solo lectura porque acá no se le pasa ninguna acción. Solo muestra el
// perfil de quien tiene la sesión: no hay id en la URL que se pueda cambiar.
export default async function MiPerfilPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const usuario = sesion.usuario;
  // El admin gestiona todo desde Settings, y ahí ve su propio perfil editable.
  if (usuario.rol === "admin") redirect("/admin/usuarios");

  const perfil = await getPerfilUsuario(usuario.id, usuario.rol);

  return <VistaPerfil usuario={usuario} perfil={perfil} propio />;
}
