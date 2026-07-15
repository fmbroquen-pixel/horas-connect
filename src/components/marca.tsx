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
  variant?: "header" | "hero";
  className?: string;
}) {
  const hero = variant === "hero";
  return (
    <div className={`${hero ? "text-center" : ""} ${className}`}>
      <p className="font-sans text-[10px] font-semibold uppercase leading-tight tracking-[0.28em] text-dc-muted">
        Embarca
      </p>
      <p className="font-sans text-[10px] uppercase leading-tight tracking-[0.2em] text-dc-muted/55">
        Distrito Connect
      </p>
      <p
        className={`mt-2 font-display uppercase leading-none text-white [text-shadow:0_0_18px_rgba(255,145,255,0.55)] ${
          hero ? "text-3xl tracking-[0.12em]" : "text-base tracking-[0.08em]"
        }`}
      >
        CORE
      </p>
    </div>
  );
}
