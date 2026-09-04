// Los tres verbos de un filtro de CORE, en ícono.
//
// Reemplazan a los botones de texto "Todos", "Limpiar" y "Listo". Los tres
// nombres siguen estando: viajan en el tooltip y en el aria-label, que es
// donde un lector de pantalla los necesita. En una lista angosta el texto se
// llevaba media fila del encabezado y, con "Mentor Owner" de título, no
// entraban los dos botones en la misma línea.
//
// Van juntos en un archivo porque son un juego: se leen en relación entre
// ellos y tienen que compartir grosor y peso visual, o uno parece más
// importante que otro sin motivo.

// Marcar todo. El cuadrado con el check es lo más cerca de "seleccionar" que
// hay sin escribirlo.
export function IconoTodos({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

// Vaciar la selección. Goma y no una cruz: la cruz en esta app cierra, y acá
// no se cierra nada -la lista queda abierta para armar otro filtro-.
export function IconoLimpiar({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M7 21l-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 21" />
      <path d="M22 21H7" />
      <path d="M5 11l9 9" />
    </svg>
  );
}

// Confirmar y cerrar.
export function IconoListo({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
