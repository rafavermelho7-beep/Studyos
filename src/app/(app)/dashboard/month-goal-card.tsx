import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { monthGoalProgress } from "@/lib/month-goal";
import { cn } from "@/lib/utils";

function formatHours(sec: number) {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function MonthGoalCard({ progress }: { progress: ReturnType<typeof monthGoalProgress> | null }) {
  // No goal yet: an honest prompt, not a made-up target.
  if (!progress) {
    return (
      <Link
        href="/settings#aparencia"
        className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <Target className="h-4 w-4 shrink-0" />
        Defina uma meta de horas pro mês e acompanhe aqui.
      </Link>
    );
  }

  const { studiedSec, goalSec, percent, done, onPace, daysLeft, perDayNeededSec } = progress;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Meta do mês</p>
          <p className="text-xs text-muted-foreground">{percent}%</p>
        </div>
        <p className="mt-0.5 text-lg font-semibold text-foreground">
          {formatHours(studiedSec)} <span className="text-sm font-normal text-muted-foreground">de {formatHours(goalSec)}</span>
        </p>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Progresso da meta do mês"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", done ? "bg-success" : "bg-accent")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className={cn("mt-2 text-xs", done ? "text-success" : onPace ? "text-muted-foreground" : "text-warning")}>
          {done
            ? "Meta batida! 🎉"
            : `Faltam ${formatHours(goalSec - studiedSec)} em ${daysLeft} dia${daysLeft === 1 ? "" : "s"} → ~${formatHours(perDayNeededSec)} por dia${onPace ? "" : " · abaixo do ritmo"}`}
        </p>
      </CardContent>
    </Card>
  );
}
