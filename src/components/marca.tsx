// Arquitectura de marca de tres niveles:
//   Embarca (marca madre) → Distrito Connect (unidad de negocio) → CORE (producto)
// CORE es el protagonista, con la tipografía pixel (font-display). Embarca y
// Distrito Connect usan tipografía estándar, con menor tamaño, peso y contraste,
// para no competir con el nombre del producto. Escalable: mañana CORE puede
// convivir con otros productos de Embarca sin rediseñar esta jerarquía.
export function Marca({
  variant = "header",
  className = "",
}: {
  variant?: "header" | "hero" | "core";
  className?: string;
}) {
  // Variante compacta para barras de navegación: solo CORE, con su identidad
  // (pixel font + glow) pero sin el bloque Embarca/Distrito Connect, para
  // priorizar el área de trabajo.
  if (variant === "core") {
    return (
      <p
        className={`font-display text-base uppercase leading-none tracking-[0.08em] text-white [text-shadow:0_0_18px_rgba(255,145,255,0.55)] ${className}`}
      >
        CORE
      </p>
    );
  }

  const hero = variant === "hero";
  const secundario = hero ? "text-[12px]" : "text-[10px]";
  return (
    <div className={`${hero ? "text-center" : ""} ${className}`}>
      <p
        className={`font-sans font-semibold uppercase leading-tight tracking-[0.28em] text-dc-muted ${secundario}`}
      >
        Embarca
      </p>
      <p
        className={`font-sans uppercase leading-tight tracking-[0.2em] text-dc-muted/55 ${secundario}`}
      >
        Distrito Connect
      </p>
      <p
        className={`font-display uppercase leading-none text-white [text-shadow:0_0_18px_rgba(255,145,255,0.55)] ${
          hero ? "mt-2.5 text-[34px] tracking-[0.12em]" : "mt-2 text-base tracking-[0.08em]"
        }`}
      >
        CORE
      </p>
    </div>
  );
}
