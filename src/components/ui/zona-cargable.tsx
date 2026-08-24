"use client";

// Un bloque que muestra un spinner mientras sus datos se recalculan.
//
// Va por componente y no sobre la pantalla entera a propósito: al cambiar un
// filtro no se actualiza todo, y tapar la pantalla completa esconde justamente
// el dato que importa —cuáles números están cambiando y cuáles no—.
//
// El contenido no se desmonta, se vuelve invisible: `invisible` conserva la
// caja, así que la card mantiene su alto y su ancho y nada salta cuando el
// spinner aparece o se va. Con `hidden` o desmontando, cada carga colapsaría
// la card y volvería a abrirla.
export function ZonaCargable({
  cargando,
  children,
  className = "",
  claseContenido = "",
}: {
  cargando: boolean;
  children: React.ReactNode;
  className?: string;
  // Clases del envoltorio interno. Hace falta cuando el hijo se acota con
  // flex-1/min-h-0: este div queda EN EL MEDIO de esa cadena, y si no la
  // continúa, el hijo pierde su límite de alto y se desborda encima de lo que
  // sigue. Para una card de alto fijo no hace falta.
  claseContenido?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* La key cambia al terminar la carga: eso remonta el envoltorio y hace
          que la animación de entrada vuelva a correr, así el valor nuevo
          aparece con un fundido en vez de saltar. */}
      <div key={cargando ? "cargando" : "listo"} className={`${claseContenido} ${cargando ? "invisible" : "dc-fade-in"}`}>
        {children}
      </div>
      {cargando && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            aria-hidden
            className="h-5 w-5 animate-spin rounded-full border-2 border-dc-line border-t-dc-peri"
          />
          <span className="sr-only">Actualizando…</span>
        </div>
      )}
    </div>
  );
}
