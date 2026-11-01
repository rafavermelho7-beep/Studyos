"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/app/actions";

export function Card({ children, className = "", as: As = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={`glass rounded-3xl p-5 sm:p-6 ${className}`}>{children}</As>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        {title && <h2 className="text-[17px] font-medium tracking-tight text-text">{title}</h2>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" | "danger" }) {
  const styles = {
    primary: "bg-text text-bg hover:bg-white",
    ghost: "border border-line-2 text-text-2 hover:text-text hover:border-white/25",
    quiet: "text-text-3 hover:text-text-2",
    danger: "border border-danger/30 text-danger/90 hover:bg-danger/10",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "signal" | "warm" | "danger" | "ok" }) {
  const t = {
    neutral: "border-line-2 text-text-3",
    signal: "border-signal/30 text-signal",
    warm: "border-warm/30 text-warm",
    danger: "border-danger/30 text-danger",
    ok: "border-ok/30 text-ok",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${t}`}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-text-3">{hint}</span>}
    </label>
  );
}

/** Formulário ligado a uma Server Action, com feedback e reset no sucesso. */
export function ActionForm({
  action,
  children,
  className = "",
  submitLabel = "Salvar",
  resetOnSuccess = true,
  onSuccess,
}: {
  action: (prev: unknown, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (r: ActionResult) => void;
}) {
  const [state, formAction, pending] = useActionState(action, null as ActionResult | null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      ref={ref}
      // onSubmit + startTransition (em vez de action=) evita o reset automático do
      // React 19 quando a action devolve erro: o usuário não perde o que digitou.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={`space-y-3 ${className}`}
    >
      {children}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        {state && (
          <span role="status" className={`text-[13px] ${state.ok ? "text-ok" : "text-danger"}`}>
            {state.ok ? state.message ?? "Feito." : state.error}
          </span>
        )}
      </div>
    </form>
  );
}

export function DomainSelect({ name = "domain", defaultValue = "" }: { name?: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className="field">
      <option value="">Geral</option>
      {DOMAIN_OPTIONS.map((d) => (
        <option key={d.key} value={d.key}>
          {d.label}
        </option>
      ))}
    </select>
  );
}

import { DOMAINS } from "@/lib/domains";
const DOMAIN_OPTIONS = DOMAINS;

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-text-3">{children}</p>;
}
