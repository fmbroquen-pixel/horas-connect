import { IconoCandado, SoloLecturaBadge } from "@/components/ui/solo-lectura-badge";

// La caja de una sección del perfil: título, aclaración y contenido.
//
// Una sola para las dos pantallas que muestran un perfil —Settings → Usuarios
// y Mi perfil— porque son la misma pantalla vista por dos personas distintas.
// Antes cada una escribía su propia card y las dos se fueron separando: mismo
// dato, distinto padding, distinto orden, distinta tipografía del título.
//
// Lo único que cambia entre las dos es si se puede editar, y eso se dice con
// el candado y la pastilla —no con otra caja—. La información no se esconde: un
// mentor ve su convenio de tarifa completo, solo que no lo puede tocar.
export function SeccionPerfil({
  titulo,
  descripcion,
  soloLectura = false,
  children,
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  soloLectura?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        {soloLectura && (
          <span className="text-dc-peri">
            <IconoCandado />
          </span>
        )}
        <h2 className="font-display text-sm uppercase text-white">{titulo}</h2>
        {soloLectura && <SoloLecturaBadge />}
      </div>
      {descripcion && <p className="mt-1 text-xs text-dc-muted">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
