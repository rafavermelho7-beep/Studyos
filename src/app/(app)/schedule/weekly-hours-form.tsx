"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { WEEKDAY_LABELS } from "@/lib/auto-schedule";
import { saveWeeklyStudyMinutesAction } from "./actions";

/** Hours available per weekday, edited in hours (half-hour steps), stored in minutes. */
export function WeeklyHoursForm({ initialMinutes }: { initialMinutes: number[] }) {
  const [hours, setHours] = useState(initialMinutes.map((m) => String(m / 60)));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        const minutes = hours.map((h) => Math.round((Number(h.replace(",", ".")) || 0) * 60));
        setError(null);
        startTransition(async () => {
          const result = await saveWeeklyStudyMinutesAction(minutes);
          if (result.error) return setError(result.error);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <label key={label} className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              value={hours[i]}
              onChange={(e) => setHours((prev) => prev.map((h, j) => (j === i ? e.target.value : h)))}
              aria-label={`Horas de estudo — ${label}`}
              className="h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-border bg-surface px-1 text-center text-sm tabular-nums text-foreground outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar horas"}
        </Button>
        {saved && <span className="animate-fade-in-up text-xs text-success">✓ Plano atualizado</span>}
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
