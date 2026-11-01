"use client";
import { startTransition, useActionState } from "react";
import { signIn, type ActionResult } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null as ActionResult | null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="glass space-y-3 rounded-3xl p-6"
    >
      <input name="email" type="email" autoComplete="email" required placeholder="E-mail" className="field" aria-label="E-mail" />
      <input name="password" type="password" autoComplete="current-password" required placeholder="Senha" className="field" aria-label="Senha" />
      <button disabled={pending} className="h-11 w-full rounded-full bg-text text-[14px] font-medium text-bg disabled:opacity-50">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-center text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
