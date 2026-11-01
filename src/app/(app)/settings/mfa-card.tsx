"use client";
import { useState, useTransition } from "react";
import { confirmMfaEnroll, disableMfa, startMfaEnroll } from "@/app/actions";
import { Badge } from "@/components/ui";

export function MfaCard({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="space-y-4 text-[13.5px]">
      <div className="flex items-center gap-2">
        <Badge tone={enabled ? "ok" : "warm"}>{enabled ? "ativo" : "desativado"}</Badge>
        <span className="text-text-3">Código de um app autenticador (Google Authenticator, 1Password, Authy) além da senha.</span>
      </div>
      {!enabled && !enroll && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await startMfaEnroll();
              if (r.ok) setEnroll(r.data as { factorId: string; qr: string; secret: string });
              else setMsg({ ok: false, text: r.error });
            })
          }
          className="rounded-full bg-text px-4 py-2 text-[13px] font-medium text-bg disabled:opacity-50"
        >
          Ativar segundo fator
        </button>
      )}
      {enroll && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code para o app autenticador" className="h-44 w-44 rounded-xl bg-white p-2" />
          <p className="text-text-3">
            Ou digite a chave: <code data-testid="totp-secret" className="break-all font-mono text-text-2">{enroll.secret}</code>
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              aria-label="Código do autenticador"
              className="field font-mono"
            />
            <button
              disabled={pending || code.length !== 6}
              onClick={() =>
                start(async () => {
                  const r = await confirmMfaEnroll(enroll.factorId, code);
                  setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Ativado." : r.error });
                  if (r.ok) setEnroll(null);
                })
              }
              className="shrink-0 rounded-full bg-text px-4 text-[13px] font-medium text-bg disabled:opacity-40"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
      {enabled && (
        <button
          disabled={pending}
          onClick={() =>
            confirm("Desativar o segundo fator?") &&
            start(async () => {
              const r = await disableMfa();
              setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Feito." : r.error });
            })
          }
          className="label hover:text-danger"
        >
          Desativar
        </button>
      )}
      {msg && <p role="status" className={msg.ok ? "text-ok" : "text-danger"}>{msg.text}</p>}
    </div>
  );
}
