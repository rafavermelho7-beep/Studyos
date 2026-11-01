"use client";
import { useState, useTransition } from "react";
import { scheduleOpportunity, setOpportunityStatus } from "@/app/actions";
import { RADAR_CATEGORIES } from "@/lib/radar/radar";
import { Badge } from "./ui";

export interface OpportunityRow {
  id: string;
  category: keyof typeof RADAR_CATEGORIES;
  title: string;
  summary: string;
  why: string;
  url: string;
  source_domain: string;
  date_start: string | null;
  deadline: string | null;
  location: string;
  price: string;
  status: string;
}

const br = (d: string) => d.split("-").reverse().join("/");

export function OpportunityCard({ o, calendarConnected, compact = false }: { o: OpportunityRow; calendarConnected: boolean; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok || r.message) setMsg({ ok: r.ok, text: r.ok ? r.message! : r.error ?? "Falhou." });
    });
  return (
    <li className={`rise rounded-2xl border border-line p-4 transition-colors hover:border-line-2 ${pending ? "opacity-60" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone="signal">{RADAR_CATEGORIES[o.category]}</Badge>
        {o.status === "saved" && <Badge tone="ok">salva</Badge>}
        {o.status === "scheduled" && <Badge tone="ok">na agenda</Badge>}
        <span className="label ml-auto normal-case tracking-normal">{o.source_domain}</span>
      </div>
      <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[15px] text-text hover:underline">
        {o.title} ↗
      </a>
      {!compact && o.summary && <p className="mt-1 text-[13.5px] leading-relaxed text-text-2">{o.summary}</p>}
      {o.why && <p className="mt-1 text-[13px] leading-relaxed text-text-3">Por que você: {o.why}</p>}
      <div className="label mt-2 normal-case tracking-normal">
        {[o.date_start && br(o.date_start), o.deadline && `prazo ${br(o.deadline)}`, o.location, o.price].filter(Boolean).join(" · ")}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-3">
        {o.status !== "saved" && o.status !== "scheduled" && (
          <button disabled={pending} onClick={() => run(() => setOpportunityStatus(o.id, "saved"))} className="label hover:text-text-2">Salvar</button>
        )}
        {calendarConnected && o.status !== "scheduled" && (o.date_start || o.deadline) && (
          <button disabled={pending} onClick={() => run(() => scheduleOpportunity(o.id))} className="label text-warm/90 hover:text-warm">Pôr na agenda</button>
        )}
        {o.status !== "dismissed" && (
          <button disabled={pending} onClick={() => run(() => setOpportunityStatus(o.id, "dismissed"))} className="label hover:text-text-2">Dispensar</button>
        )}
      </div>
      {msg && <p role="status" className={`mt-2 text-[12.5px] ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </li>
  );
}
