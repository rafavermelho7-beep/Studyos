"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePresence } from "./presence";

/**
 * Dispara o radar: automático (semanal, ao abrir o app) ou manual. Mostra estado e
 * resultado. A busca pode levar ~30–60 s (pesquisa real na web).
 */
export function RadarTrigger({ auto, available }: { auto: boolean; available: boolean }) {
  const router = useRouter();
  const presence = usePresence();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(auto && available ? "running" : "idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function request(trigger: "auto" | "manual") {
    presence.set("acting", "radar");
    try {
      const res = await fetch("/api/radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger }) });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Falha no radar.");
      setState("done");
      setMsg(j.skipped ? null : j.found ? `${j.found} nova(s) oportunidade(s).` : "Nada novo que valha seu tempo desta vez.");
      router.refresh();
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    } finally {
      presence.set("standby");
    }
  }

  useEffect(() => {
    if (!(auto && available)) return;
    const t = setTimeout(() => void request("auto"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!available) return <span className="label normal-case tracking-normal">Radar requer chave da Anthropic e orçamento normal.</span>;
  return (
    <span className="flex items-center gap-3">
      {msg && <span role="status" className={`text-[12.5px] ${state === "error" ? "text-danger" : "text-text-3"}`}>{msg}</span>}
      <button
        disabled={state === "running"}
        onClick={() => {
          setState("running");
          setMsg(null);
          void request("manual");
        }}
        className="label hover:text-text-2 disabled:opacity-50"
      >
        {state === "running" ? "Pesquisando na web…" : "Buscar agora"}
      </button>
    </span>
  );
}
