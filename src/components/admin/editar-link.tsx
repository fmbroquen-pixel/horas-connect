import Link from "next/link";
import { BTN_ICON_SM } from "@/lib/ui";

// Botón de solo ícono "Editar" (lápiz) que lleva al detalle. Lo usan las
// tablas de Settings (Usuarios, Clientes) para las acciones de fila, con el
// mismo estilo secundario de CORE y tooltip nativo al hover.
export function EditarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={BTN_ICON_SM} title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </Link>
  );
}
