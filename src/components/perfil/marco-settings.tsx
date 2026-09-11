// El marco de toda pantalla de Settings: la etiqueta SETTINGS arriba y el
// contenido debajo, a la misma distancia.
//
// Lo usan el layout de /admin (Usuarios, Clientes, Conceptos) y el de
// /mi-perfil. Son la misma sección para roles distintos; antes Mi perfil
// escribía su propia etiqueta con otro espaciado y la pantalla arrancaba más
// arriba que la del admin.
export function MarcoSettings({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 font-display text-xs tracking-[0.3em] text-dc-pink">
        SETTINGS
      </p>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
