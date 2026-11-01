"use client";
import { useActionState, useTransition } from "react";
import { createIngestToken, revokeIngestToken, type ActionResult } from "@/app/actions";

interface Token { id: string; name: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

export function TokenManager({ tokens }: { tokens: Token[] }) {
  const [state, action, pending] = useActionState(createIngestToken, null as ActionResult | null);
  const [revoking, start] = useTransition();
  const token = state?.ok ? (state.data?.token as string | undefined) : undefined;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4 text-[13.5px]">
      <p className="leading-relaxed text-text-3">
        O Apple Saúde não oferece API web. Um Atalho no iPhone lê os agregados do dia e os envia para o LIFE ENGINE com um token exclusivo
        (só escrita de saúde; revogável a qualquer momento).
      </p>
      <form action={action} className="flex gap-2">
        <input name="name" placeholder="Nome do dispositivo" defaultValue="iPhone" className="field" />
        <button disabled={pending} className="shrink-0 rounded-full bg-text px-4 text-[13px] font-medium text-bg disabled:opacity-50">
          Gerar token
        </button>
      </form>
      {state && !state.ok && <p className="text-danger">{state.error}</p>}
      {token && (
        <div className="rounded-2xl border border-warm/30 bg-warm/[0.04] p-4">
          <div className="label mb-2 text-warm">Copie agora — não será exibido de novo</div>
          <code className="block break-all font-mono text-[12px] text-text">{token}</code>
        </div>
      )}
      {tokens.length > 0 && (
        <ul className="space-y-1.5">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className={t.revoked_at ? "text-text-3 line-through" : "text-text-2"}>
                {t.name} <span className="label ml-1">{t.last_used_at ? `usado ${t.last_used_at.slice(0, 10)}` : "nunca usado"}</span>
              </span>
              {!t.revoked_at && (
                <button disabled={revoking} onClick={() => start(async () => void (await revokeIngestToken(t.id)))} className="label hover:text-danger">
                  Revogar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <details className="text-text-3">
        <summary className="label cursor-pointer hover:text-text-2">Como montar o Atalho</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed">
          <li>App Atalhos → novo atalho → ações &quot;Buscar Amostras de Saúde&quot; para Sono, Passos, Minutos de Exercício e FC em Repouso (hoje).</li>
          <li>Some/calcule os valores e monte um Dicionário: day (AAAA-MM-DD), sleep_minutes, steps, workout_minutes, workouts, resting_hr.</li>
          <li>&quot;Obter Conteúdo do URL&quot;: POST para <code className="text-text-2">{origin || "https://SEU-DOMINIO"}/api/ingest/health</code>, JSON, cabeçalho Authorization: Bearer SEU_TOKEN.</li>
          <li>Automação pessoal: rodar todo dia às 23h. Para histórico, envie {"{ \"days\": [ ... ] }"} com até 400 dias.</li>
        </ol>
      </details>
    </div>
  );
}
