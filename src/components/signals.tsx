"use client";
// Avisos do agente + propostas aguardando decisão. Único canal do JARVIS (DEC-026).
import { useState, useTransition } from "react";
import { resolveProposal, setInsightStatus } from "@/app/actions";
import { domainLabel } from "@/lib/domains";
import { Badge } from "./ui";

export interface InsightItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  domain: string | null;
  confidence: number;
  origin: string;
  created_at: string;
}
export interface ProposalItem {
  id: string;
  type: string;
  payload: { title?: string; description?: string; domain?: string | null; why?: string; start?: string | null; duration_minutes?: number | null };
  rationale: string;
}

const KIND: Record<string, { label: string; tone: "warm" | "signal" | "danger" | "neutral" }> = {
  problem: { label: "Problema", tone: "danger" },
  opportunity: { label: "Oportunidade", tone: "signal" },
  pattern: { label: "Padrão", tone: "signal" },
  conflict: { label: "Conflito", tone: "warm" },
  attention: { label: "Atenção", tone: "warm" },
};
const PROPOSAL: Record<string, string> = {
  create_goal: "Novo objetivo",
  create_project: "Novo projeto",
  record_decision: "Registrar decisão",
  create_calendar_event: "Evento na agenda",
};

function whenLabel(start?: string | null, dur?: number | null) {
  if (!start) return null;
  const [d, t] = start.split("T");
  const date = d.split("-").reverse().join("/");
  return t ? `${date} às ${t}${dur ? ` · ${dur} min` : ""}` : `${date} · dia inteiro`;
}

export function Signals({ insights, proposals }: { insights: InsightItem[]; proposals: ProposalItem[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!insights.length && !proposals.length) {
    return <p className="text-[14px] text-text-3">Nada pedindo sua atenção agora. Silêncio também é informação.</p>;
  }
  return (
    <ul className="space-y-3">
      {error && (
        <li role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-[13px] text-danger">
          {error}
        </li>
      )}
      {proposals.map((p) => (
        <li key={p.id} className="rise rounded-2xl border border-warm/15 bg-warm/[0.03] p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge tone="warm">{PROPOSAL[p.type] ?? p.type}</Badge>
            {p.payload.domain && <span className="label">{domainLabel(p.payload.domain)}</span>}
          </div>
          <div className="text-[15px] text-text">{p.payload.title}</div>
          {p.type === "create_calendar_event" && (
            <div className="mt-0.5 text-[13px] text-warm/90">
              {whenLabel(p.payload.start, p.payload.duration_minutes)} · será criado na sua Google Agenda ao aceitar
            </div>
          )}
          {(p.rationale || p.payload.why) && <p className="mt-1 text-[13.5px] leading-relaxed text-text-3">{p.rationale || p.payload.why}</p>}
          <div className="mt-3 flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await resolveProposal(p.id, true);
                  setError(r.ok ? null : r.error);
                })
              }
              className="rounded-full bg-text px-3.5 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-40"
            >
              Aceitar
            </button>
            <button
              disabled={pending}
              onClick={() => start(async () => void (await resolveProposal(p.id, false)))}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] text-text-3 hover:text-text-2 disabled:opacity-40"
            >
              Descartar
            </button>
          </div>
        </li>
      ))}
      {insights.map((i) => {
        const k = KIND[i.kind] ?? { label: i.kind, tone: "neutral" as const };
        return (
          <li key={i.id} className="group rise rounded-2xl border border-line p-4 transition-colors hover:border-line-2">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge tone={k.tone}>{k.label}</Badge>
              {i.domain && <span className="label">{domainLabel(i.domain)}</span>}
              <span className="label ml-auto" title="Confiança da evidência">
                {Math.round(i.confidence * 100)}%
              </span>
            </div>
            <div className="text-[15px] text-text">{i.title}</div>
            {i.body && <p className="mt-1 text-[13.5px] leading-relaxed text-text-3">{i.body}</p>}
            <div className="mt-2.5 flex gap-3 opacity-70 transition-opacity group-hover:opacity-100">
              <button disabled={pending} onClick={() => start(async () => void (await setInsightStatus(i.id, "acted")))} className="label hover:text-text-2">
                Resolvido
              </button>
              <button disabled={pending} onClick={() => start(async () => void (await setInsightStatus(i.id, "dismissed")))} className="label hover:text-text-2">
                Dispensar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
