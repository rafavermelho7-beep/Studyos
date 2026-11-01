"use client";
import { useState, useTransition } from "react";
import { disconnectCalendar, syncCalendarNow } from "@/app/actions";
import type { CalendarStatus } from "@/lib/services/calendar";
import { Badge } from "@/components/ui";

const FLASH: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Google Agenda conectada.", ok: true },
  denied: { text: "Você negou o acesso no Google.", ok: false },
  invalid_state: { text: "Falha de segurança no retorno do Google (state). Tente de novo.", ok: false },
  no_refresh: { text: "O Google não enviou permissão contínua. Remova o acesso do app em myaccount.google.com e reconecte.", ok: false },
  unconfigured: { text: "Integração não configurada no servidor.", ok: false },
  error: { text: "Erro ao conectar com o Google.", ok: false },
};

export function CalendarCard({ status, flash }: { status: CalendarStatus; flash?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(flash ? FLASH[flash] ?? null : null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Feito." : r.error ?? "Falhou." });
    });

  return (
    <div className="space-y-4 text-[13.5px]">
      <p className="leading-relaxed text-text-3">
        Leitura dos eventos (só título e horário; sem participantes nem descrição) para o JARVIS considerar sua semana e detectar provas.
        Escrita: o JARVIS só <em>propõe</em> eventos — nada é criado sem você clicar em Aceitar.
      </p>
      {status.state === "unconfigured" && (
        <div className="rounded-2xl border border-line p-4 text-text-3">
          <Badge tone="warm">configuração pendente</Badge>
          <p className="mt-2">Faltam no servidor: {status.missing.join(", ")}. Veja docs/IMPLEMENTATION-HANDOFF.md §Google Agenda.</p>
        </div>
      )}
      {status.state === "disconnected" && (
        <a href="/api/integrations/google/start" className="inline-flex h-9 items-center rounded-full bg-text px-4 text-[13px] font-medium text-bg">
          Conectar Google Agenda
        </a>
      )}
      {status.state === "connected" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.status === "active" ? "ok" : "danger"}>{status.status === "active" ? "conectada" : "erro"}</Badge>
            <span className="label normal-case tracking-normal">
              {status.lastSyncAt ? `sincronizada ${new Date(status.lastSyncAt).toLocaleString("pt-BR")}` : "ainda não sincronizada"}
            </span>
          </div>
          {status.lastError && <p className="text-danger">{status.lastError}</p>}
          <div className="flex flex-wrap gap-3">
            <button disabled={pending} onClick={() => run(syncCalendarNow)} className="rounded-full border border-line-2 px-4 py-1.5 text-[13px] text-text-2 hover:text-text disabled:opacity-40">
              {pending ? "Sincronizando…" : "Sincronizar agora"}
            </button>
            {status.status !== "active" && (
              <a href="/api/integrations/google/start" className="rounded-full border border-line-2 px-4 py-1.5 text-[13px] text-text-2 hover:text-text">
                Reconectar
              </a>
            )}
            <button
              disabled={pending}
              onClick={() => confirm("Desconectar a Google Agenda e apagar a cópia local dos eventos?") && run(disconnectCalendar)}
              className="label hover:text-danger"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={msg.ok ? "text-ok" : "text-danger"}>{msg.text}</p>}
    </div>
  );
}
