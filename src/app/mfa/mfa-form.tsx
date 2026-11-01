"use client";
import { startTransition, useActionState } from "react";
import { verifyMfaLogin, type ActionResult } from "@/app/actions";

export function MfaForm() {
  const [state, action, pending] = useActionState(verifyMfaLogin, null as ActionResult | null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="glass space-y-3 rounded-3xl p-6"
    >
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        placeholder="000000"
        aria-label="Código de verificação"
        className="field text-center font-mono text-[22px] tracking-[0.4em]"
      />
      <button disabled={pending} className="h-11 w-full rounded-full bg-text text-[14px] font-medium text-bg disabled:opacity-50">
        {pending ? "Verificando…" : "Verificar"}
      </button>
      {state && !state.ok && <p role="alert" className="text-center text-[13px] text-danger">{state.error}</p>}
    </form>
  );
}
