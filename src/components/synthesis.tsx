"use client";
import { useEffect, useState } from "react";
import { RichText } from "./rich-text";
import { Button } from "./ui";

/**
 * Síntese (diária ou semanal). Gerada sob demanda na primeira abertura do período
 * (DEC-T13: evita gastar IA com sínteses que ninguém lê) e guardada no banco.
 */
export function Synthesis({
  kind,
  initial,
  autoGenerate,
  aiAvailable,
}: {
  kind: "daily" | "weekly";
  initial: { content: string; model: string | null } | null;
  autoGenerate: boolean;
  aiAvailable: boolean;
}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!initial && autoGenerate && aiAvailable);
  const [error, setError] = useState<string | null>(null);

  function generate(force = false) {
    setLoading(true);
    setError(null);
    void request(force);
  }

  async function request(force: boolean) {
    try {
      const res = await fetch("/api/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, force }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha ao gerar.");
      setData({ content: j.content, model: j.model });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initial && autoGenerate && aiAvailable) void request(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-2.5" aria-busy>
        {[92, 78, 85, 60].map((w, i) => (
          <div key={i} className="h-3 animate-pulse rounded-full bg-white/[0.05]" style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
        ))}
        <p className="label pt-1">JARVIS está compondo a síntese</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-text-3">
          {aiAvailable
            ? kind === "daily"
              ? "A síntese de hoje ainda não foi gerada."
              : "A revisão desta semana ainda não foi feita."
            : "IA indisponível (sem chave configurada ou orçamento esgotado). Os registros e avisos locais continuam funcionando."}
        </p>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {aiAvailable && (
          <Button onClick={() => generate()} disabled={loading}>
            {kind === "daily" ? "Gerar síntese" : "Iniciar revisão semanal"}
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="fade-in">
      <RichText text={data.content} className="text-[15px] leading-relaxed text-text-2" />
      <div className="mt-4 flex items-center gap-3">
        {error && <span className="text-[13px] text-danger">{error}</span>}
        {aiAvailable && (
          <button onClick={() => generate(true)} disabled={loading} className="label hover:text-text-2 disabled:opacity-40">
            {loading ? "Atualizando…" : "Regenerar"}
          </button>
        )}
      </div>
    </div>
  );
}
