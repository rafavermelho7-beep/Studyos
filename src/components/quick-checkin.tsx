"use client";
// Registro rápido (PEN-11): três toques, sem formulário pesado.
import { useState, useTransition } from "react";
import { saveCheckin } from "@/app/actions";

const SCALES = [
  { name: "energy", label: "Energia" },
  { name: "mood", label: "Humor" },
  { name: "sleep_quality", label: "Sono" },
] as const;

export function QuickCheckin({ initial }: { initial: { energy: number | null; mood: number | null; sleep_quality: number | null; note: string } | null }) {
  const [vals, setVals] = useState<Record<string, number | null>>({
    energy: initial?.energy ?? null,
    mood: initial?.mood ?? null,
    sleep_quality: initial?.sleep_quality ?? null,
  });
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function persist(next: Record<string, number | null>, nextNote = note) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(next)) if (v !== null) fd.set(k, String(v));
    fd.set("note", nextNote);
    start(async () => {
      const r = await saveCheckin(null, fd);
      setSaved(r.ok ? "Registrado" : r.error);
    });
  }

  return (
    <div className="space-y-3.5">
      {SCALES.map((s) => (
        <div key={s.name} className="flex items-center justify-between gap-3">
          <span className="text-[13.5px] text-text-2">{s.label}</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label={s.label}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = vals[s.name] !== null && n <= (vals[s.name] ?? 0);
              return (
                <button
                  key={n}
                  role="radio"
                  aria-checked={vals[s.name] === n}
                  aria-label={`${s.label} ${n}`}
                  disabled={pending}
                  onClick={() => {
                    const next = { ...vals, [s.name]: n };
                    setVals(next);
                    persist(next);
                  }}
                  className={`h-7 w-7 rounded-full border text-[11px] transition-all ${
                    on ? "border-signal/50 bg-signal/15 text-signal" : "border-line text-text-3 hover:border-line-2"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (initial?.note ?? "") && persist(vals, note)}
        placeholder="Uma linha sobre o dia (opcional)"
        maxLength={300}
        className="field text-[13.5px]"
      />
      <div className="label h-3">{pending ? "Salvando…" : saved}</div>
    </div>
  );
}
