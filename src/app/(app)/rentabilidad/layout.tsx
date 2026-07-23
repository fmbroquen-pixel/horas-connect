import { TabsNav } from "../tabs-nav";

// Analytics se divide en dos tableros: Márgen y Rentabilidad (financiero,
// mensual) y Estado de Proyectos (operativo, gestión del portafolio). El
// contenido de cada uno vive en su propia página; acá solo la navegación
// entre ambos, sin duplicar el título de ninguno.
export default function RentabilidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-dc-line">
        <TabsNav
          size="sm"
          containerClass=""
          tabs={[
            { href: "/rentabilidad", label: "Márgen y Rentabilidad", exact: true },
            { href: "/rentabilidad/estado", label: "Estado de Proyectos" },
          ]}
        />
      </div>
      <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
