"use client";

import { useActionState } from "react";
import { loginConPassword, loginConGoogle } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginConPassword,
    undefined,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-dc-deep px-4">
      <div className="w-full max-w-sm rounded-2xl border border-dc-line bg-dc-card p-8 backdrop-blur">
        <div className="mb-6 flex gap-2">
          <span className="h-3 w-3 rounded-full border border-white/40 bg-dc-deep" />
          <span className="h-3 w-3 rounded-full bg-dc-pink" />
          <span className="h-3 w-3 rounded-full bg-dc-peri" />
          <span className="h-3 w-3 rounded-full bg-dc-purple" />
          <span className="h-3 w-3 rounded-full bg-dc-blue" />
        </div>

        <p className="font-display text-xs tracking-[0.3em] text-dc-pink">
          DISTRITO CONNECT
        </p>
        <h1 className="mt-3 font-display text-2xl uppercase text-white">
          Horas Connect
        </h1>
        <p className="mt-2 text-sm text-dc-muted">
          Registro de horas y rentabilidad de mentores.
        </p>

        <form action={loginConGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-xl border border-dc-line bg-white/95 px-4 py-2.5 text-sm font-medium text-dc-deep transition hover:bg-white"
          >
            Continuar con Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-dc-muted">
          <span className="h-px flex-1 bg-dc-line" />
          o con email
          <span className="h-px flex-1 bg-dc-line" />
        </div>

        <form action={formAction} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-dc-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs text-dc-muted"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
            />
          </div>

          {state?.error && (
            <p className="text-xs text-dc-pink">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-dc-purple px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
