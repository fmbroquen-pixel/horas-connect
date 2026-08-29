import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, guardarTarifa, alternarActivoUsuario } from "../actions";
import { BotonEstado } from "@/components/boton-estado";
import {
  GuardadoPaginaProvider,
  BotonGuardarPagina,
} from "@/components/guardado-pagina";
import { GuardiaCambios } from "@/components/guardia-cambios";
import { TarifaForm } from "./tarifa-form";
import { ProyectosForm } from "./proyectos-form";
import type { ProyectoAsignable } from "../constantes";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  // Guest y admin reportan horas, así que ambos necesitan tarifa (el admin
  // también actúa como mentor). El reader no reporta horas.
  const puedeTarifa = usuario.rol === "guest" || usuario.rol === "admin";
  // Todos los roles reciben proyectos asignados: guest y admin para limitar
  // dónde cargan horas; reader para acotar qué rentabilidad puede ver.
  const asignaProyectos = true;

  const [tarifas, clientes, asignados] = await Promise.all([
    puedeTarifa
      ? prisma.tarifa.findMany({
          where: { usuarioId: id },
          orderBy: { vigenteDesde: "desc" },
        })
      : Promise.resolve([]),
    asignaProyectos
      ? prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
      : Promise.resolve([]),
    // Todas las asignaciones, de cualquier usuario: hacen falta para saber
    // qué proyectos ya tienen owner o los backups completos.
    asignaProyectos
      ? prisma.proyectoAsignado.findMany({
          include: { usuario: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
  ]);

  const vigentes = tarifas.filter((t) => t.vigenteHasta === null);
  const historial = tarifas.filter((t) => t.vigenteHasta !== null);
  // Estado de cada proyecto para las solapas: el rol propio del usuario que
  // se edita y los cupos que ocupan los demás.
  const proyectosAsignables: ProyectoAsignable[] = clientes.map((c) => {
    const delCliente = asignados.filter((a) => a.clienteId === c.id);
    const propia = delCliente.find((a) => a.usuarioId === id);
    const ajenas = delCliente.filter((a) => a.usuarioId !== id);
    return {
      id: c.id,
      nombre: c.nombre,
      rolPropio: propia?.rol ?? "",
      sinRol: Boolean(propia) && !propia?.rol,
      ownerAjeno: ajenas.find((a) => a.rol === "owner")?.usuario.nombre ?? null,
      backupsAjenos: ajenas
        .filter((a) => a.rol === "backup")
        .map((a) => a.usuario.nombre),
    };
  });

  // Desde cuándo rige la tarifa que está cargada. Las cuatro combinaciones se
  // guardan juntas, así que alcanza con mirar la primera vigente.
  const vigenteDesdeActual =
    vigentes.find((v) => v.modalidad !== "valor_cero")?.vigenteDesde ?? null;

  const buscarValor = (modalidad: string, ownership: string) => {
    const t = vigentes.find((v) => v.modalidad === modalidad && v.ownership === ownership);
    return t ? Number(t.valorUsd) : undefined;
  };

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
          <BotonEstado
            activo={usuario.activo}
            entidad="Usuario"
            etiquetaActivo="Activo"
            etiquetaInactivo="Bloqueado"
            alternar={alternarActivoUsuario.bind(null, usuario.id)}
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
        <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
          <h2 className="font-display text-sm uppercase text-white">
            Convenio de tarifa
          </h2>
          <div className="mt-4">
            <TarifaForm
              tipoActual={usuario.tipoTarifa}
              valores={{
                presencialOwner: buscarValor("presencial", "owner"),
                presencialBackup: buscarValor("presencial", "backup"),
                virtualOwner: buscarValor("virtual", "owner"),
                virtualBackup: buscarValor("virtual", "backup"),
              }}
              vigenteDesdeActual={
                vigenteDesdeActual
                  ? vigenteDesdeActual.toLocaleDateString("es-AR", { timeZone: "UTC" })
                  : null
              }
              action={guardarTarifa.bind(null, usuario.id)}
            />
          </div>
        </div>
      )}

      {/* La última sección editable y el Guardar van juntos, con poco aire
          entre ellos: son un grupo, no dos bloques sueltos. El space-y-8 de
          afuera sigue separando ese grupo del historial. */}
      <div className="space-y-3">
      {asignaProyectos && (
        <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
          <h2 className="font-display text-sm uppercase text-white">
            Clientes asignados
          </h2>
          <p className="mt-1 text-xs text-dc-muted">
            {usuario.rol === "reader"
              ? "Limitan qué clientes puede ver en el informe de rentabilidad."
              : "Limitan en qué clientes puede cargar horas y con qué rol. Cada proyecto tiene un único Mentor Owner y hasta dos Backup."}
          </p>
          <div className="mt-4">
            <ProyectosForm
              usuarioId={usuario.id}
              proyectos={proyectosAsignables}
            />
          </div>
        </div>
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
        <HistorialTarifas
          historial={historial.map((t) => ({
            id: t.id,
            modalidad: t.modalidad,
            ownership: t.ownership,
            valorUsd: Number(t.valorUsd),
            vigenteDesde: t.vigenteDesde,
            vigenteHasta: t.vigenteHasta,
          }))}
        />
      )}
    </div>
    </GuardadoPaginaProvider>
  );
}
