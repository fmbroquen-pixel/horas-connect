import { getSesionActual } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";

export default async function SinAccesoPage() {
  const sesion = await getSesionActual();

  if (sesion.estado === "sin_sesion") {
    redirect("/login");
  }
  if (sesion.estado === "autorizado") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-dc-deep px-4">
      <div className="w-full max-w-sm rounded-2xl border border-dc-line bg-dc-card p-8 text-center">
        <p className="font-display text-xs tracking-[0.3em] text-dc-pink">
          ACCESO RESTRINGIDO
        </p>
        <h1 className="mt-3 font-display text-xl uppercase text-white">
          Sin autorización
        </h1>
        <p className="mt-3 text-sm text-dc-muted">
          <span className="text-dc-text">{sesion.email}</span> no está
          habilitado para usar Timetracker Connect. Contactá al administrador para
          que te agregue.
        </p>
        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-xl border border-dc-line px-4 py-2.5 text-sm font-medium text-dc-text transition hover:bg-dc-line/40"
          >
            Volver a intentar con otra cuenta
          </button>
        </form>
      </div>
    </main>
  );
}
