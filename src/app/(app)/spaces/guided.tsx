"use client";
import { useTransition } from "react";
import { createGuidedSpace } from "@/app/actions";

const GUIDES = [
  { key: "carreira", title: "Rumo de carreira", text: "Interesses, forças, 3 caminhos e pequenos experimentos." },
  { key: "financas", title: "Dinheiro sob controle", text: "Para onde vai o dinheiro, meta realista e cortes de impulso." },
  { key: "proposito", title: "Propósito e sentido", text: "Valores, uma prática semanal de reflexão e objetivos com sentido." },
] as const;

export function GuidedSpaces() {
  const [pending, start] = useTransition();
  return (
    <div className="mb-6">
      <div className="label mb-3">Começar com um guia</div>
      <div className="grid gap-3 sm:grid-cols-3">
        {GUIDES.map((g) => (
          <button
            key={g.key}
            disabled={pending}
            onClick={() => start(async () => void (await createGuidedSpace(g.key)))}
            className="glass rounded-3xl p-5 text-left transition-colors hover:border-line-2 disabled:opacity-50"
          >
            <div className="text-[15px] text-text">{g.title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-text-3">{g.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
