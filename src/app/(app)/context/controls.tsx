"use client";
import { useState, useTransition } from "react";
import { deleteStudyEvent } from "@/app/actions";

export function RatingSlider({ name, label, hue, initial }: { name: string; label: string; hue: number; initial?: number }) {
  const [v, setV] = useState<number | null>(initial ?? null);
  return (
    <div className="grid grid-cols-[110px_1fr_28px] items-center gap-3">
      <span className="text-[13px] text-text-2">{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        value={v ?? 5}
        onChange={(e) => setV(Number(e.target.value))}
        className="range"
        style={{ opacity: v === null ? 0.35 : 1, accentColor: `hsl(${hue} 70% 65%)` }}
        aria-label={label}
      />
      <span className="text-right font-mono text-[12px]" style={{ color: v === null ? "var(--text-3)" : `hsl(${hue} 70% 72%)` }}>
        {v ?? "–"}
      </span>
      {v !== null && <input type="hidden" name={name} value={v} />}
    </div>
  );
}

export function DeleteEventButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => void (await deleteStudyEvent(id)))} className="text-text-3 hover:text-danger" aria-label="Remover">
      ×
    </button>
  );
}
