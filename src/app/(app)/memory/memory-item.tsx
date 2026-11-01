"use client";
import { useState, useTransition } from "react";
import { memoryCommand } from "@/app/actions";
import { domainLabel } from "@/lib/domains";
import { Badge } from "@/components/ui";

export interface MemoryRow {
  id: string;
  kind: string;
  content: string;
  domain: string | null;
  sensitivity: string;
  status: string;
  confidence: number;
  source: string;
  pinned: boolean;
  valid_until: string | null;
  updated_at: string;
  last_used_at: string | null;
}

const KIND: Record<string, string> = {
  fact: "fato", preference: "preferência", value: "valor", belief: "crença", event: "acontecimento",
  context: "contexto", inference: "hipótese", hypothesis: "hipótese",
};
const SOURCE: Record<string, string> = {
  user_stated: "você disse", user_confirmed: "você confirmou", agent_inferred: "inferido pelo JARVIS", imported: "importado", system: "sistema",
};

export function MemoryItem({ m }: { m: MemoryRow }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.content);
  const run = (action: Parameters<typeof memoryCommand>[0]["action"], content?: string) =>
    start(async () => {
      const r = await memoryCommand({ id: m.id, action, content });
      if (r.ok) setEditing(false);
    });
  const hypothesis = m.kind === "hypothesis" || m.kind === "inference";
  const needsReview = m.status === "proposed" || (hypothesis && m.status === "active");

  return (
    <li className={`py-4 first:pt-0 last:pb-0 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone={hypothesis ? "warm" : "neutral"}>{KIND[m.kind] ?? m.kind}</Badge>
        {m.sensitivity !== "normal" && <Badge tone={m.sensitivity === "restricted" ? "danger" : "warm"}>{m.sensitivity === "restricted" ? "restrito" : "sensível"}</Badge>}
        {m.status === "proposed" && <Badge tone="signal">aguarda confirmação</Badge>}
        {m.pinned && <Badge tone="signal">fixada</Badge>}
        <span className="label">{domainLabel(m.domain)}</span>
      </div>
      {editing ? (
        <div className="flex gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="field text-[14px]" />
          <div className="flex flex-col gap-1">
            <button onClick={() => run("edit", text)} className="label hover:text-text">Salvar</button>
            <button onClick={() => setEditing(false)} className="label hover:text-text-2">Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="text-[14.5px] leading-relaxed text-text">{m.content}</p>
      )}
      <div className="label mt-1.5 normal-case tracking-normal">
        {SOURCE[m.source] ?? m.source} · confiança {Math.round(m.confidence * 100)}% · atualizado {m.updated_at.slice(0, 10).split("-").reverse().join("/")}
        {m.valid_until ? ` · válido até ${m.valid_until.split("-").reverse().join("/")}` : ""}
        {m.last_used_at ? " · usado em conversas" : ""}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {needsReview && (
          <button onClick={() => run("confirm")} className="label text-ok/90 hover:text-ok">
            Confirmar
          </button>
        )}
        {m.status === "active" || m.status === "proposed" ? (
          <>
            {needsReview && <button onClick={() => run("reject")} className="label hover:text-text-2">Rejeitar</button>}
            <button onClick={() => setEditing(true)} className="label hover:text-text-2">Corrigir</button>
            {!needsReview && <button onClick={() => run(m.pinned ? "unpin" : "pin")} className="label hover:text-text-2">{m.pinned ? "Desafixar" : "Fixar"}</button>}
            {!needsReview && <button onClick={() => run("outdated")} className="label hover:text-text-2">Desatualizada</button>}
          </>
        ) : (
          <button onClick={() => run("restore")} className="label hover:text-text-2">Restaurar</button>
        )}
        <button
          onClick={() => {
            if (confirm("Excluir esta memória permanentemente?")) run("delete");
          }}
          className="label hover:text-danger"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
