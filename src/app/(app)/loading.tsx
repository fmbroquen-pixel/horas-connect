// Esqueleto instantáneo que se muestra mientras carga cada solapa, para que
// la navegación se sienta inmediata en vez de dejar la pantalla en blanco.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-40 rounded bg-dc-line" />
      <div className="mt-2 h-4 w-72 rounded bg-dc-line/60" />
      <div className="mt-6 space-y-2 rounded-2xl border border-dc-line p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-dc-line/40" />
        ))}
      </div>
    </div>
  );
}
