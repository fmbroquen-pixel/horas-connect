"use client";

import { useActionState } from "react";
import { loginConPassword, loginConGoogle } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginConPassword,
    undefined,
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dc-deep px-4">
      <span
        className="dc-blob -left-32 -top-40 h-[520px] w-[520px] opacity-70"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, var(--dc-purple), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <span
        className="dc-blob -right-40 -top-24 h-[560px] w-[560px] opacity-70"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, var(--dc-blue), transparent 70%)",
          animationDelay: "-8s",
        }}
        aria-hidden="true"
      />
      <span
        className="dc-blob -bottom-52 right-1/4 h-[380px] w-[380px] opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--dc-pink), transparent 70%)",
          animationDelay: "-15s",
        }}
        aria-hidden="true"
      />
      <div className="dc-noise" aria-hidden="true" />

      <div className="relative w-full max-w-sm rounded-2xl border border-dc-line bg-dc-card p-8 backdrop-blur">
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
          Timetracker Connect
        </h1>

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
