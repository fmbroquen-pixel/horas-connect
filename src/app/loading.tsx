import { Marca } from "@/components/marca";

// Pantalla de carga a nivel de aplicación: muestra la marca (Embarca →
// Distrito Connect → CORE) centrada mientras se resuelve la primera carga.
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-dc-deeper">
      <Marca variant="hero" />
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-dc-line border-t-dc-peri" />
    </div>
  );
}
