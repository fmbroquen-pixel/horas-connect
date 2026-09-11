import { MarcoSettings } from "@/components/perfil/marco-settings";

// Mi perfil es la pestaña Usuario del Settings de mentor y reader: el mismo
// marco que el Settings del admin. El guard vive en la página.
export default function MiPerfilLayout({ children }: { children: React.ReactNode }) {
  return <MarcoSettings>{children}</MarcoSettings>;
}
