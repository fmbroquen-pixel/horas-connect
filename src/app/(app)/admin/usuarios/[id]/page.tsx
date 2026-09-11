import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPerfilUsuario } from "@/lib/perfil-usuario";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, guardarTarifa, alternarActivoUsuario } from "../actions";
import { VistaPerfil } from "@/components/perfil/vista-perfil";

// El perfil de cualquier usuario, editable: es el admin quien lo mira. La
// pantalla es la misma que ve cada mentor o reader en Mi perfil (VistaPerfil);
// lo que la hace editable es que acá se le pasan las acciones.
export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  const perfil = await getPerfilUsuario(id, usuario.rol);

  return (
    <VistaPerfil
      usuario={usuario}
      perfil={perfil}
      propio={admin.id === usuario.id}
      volver={{ href: "/admin/usuarios", label: "Volver a Usuarios" }}
      edicion={{
        actualizarUsuario: actualizarUsuario.bind(null, usuario.id),
        guardarTarifa: guardarTarifa.bind(null, usuario.id),
        alternarActivo: alternarActivoUsuario.bind(null, usuario.id),
      }}
    />
  );
}
