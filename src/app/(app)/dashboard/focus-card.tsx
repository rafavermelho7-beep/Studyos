import Link from "next/link";
import { Play, Target } from "lucide-react";
import type { FocusRecommendation } from "@/server/services/planning";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const urgencyMeta = {
  alta: { label: "Alta prioridade", dot: "bg-danger", className: "bg-danger-soft text-danger", pulse: true },
  media: { label: "Média prioridade", dot: "bg-warning", className: "bg-warning-soft text-warning", pulse: false },
  baixa: { label: "Prioridade baixa", dot: "bg-success", className: "bg-success-soft text-success", pulse: false },
} as const;

const suggestedMinutes = { alta: 45, media: 30, baixa: 20 } as const;

export function FocusCard({ top, rest }: { top: FocusRecommendation; rest: FocusRecommendation[] }) {
  const urgency = urgencyMeta[top.urgency];

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-md)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-[0.16] blur-3xl"
        style={{ backgroundColor: top.subjectColor }}
      />

      <div className="relative flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="h-3.5 w-3.5" strokeWidth={2.25} />
          Seu foco agora
        </p>
        <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", urgency.className)}>
          <span className="relative flex h-1.5 w-1.5">
            {urgency.pulse && (
              <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", urgency.dot)} />
            )}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", urgency.dot)} />
          </span>
          {urgency.label}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-2.5">
        <span className="h-3 w-3 shrink-0 rounded-full ring-4" style={{ backgroundColor: top.subjectColor, boxShadow: `0 0 0 4px color-mix(in srgb, ${top.subjectColor} 18%, transparent)` }} />
        <p className="text-xl font-semibold tracking-tight text-foreground">{top.subjectName}</p>
      </div>
      <p className="relative mt-0.5 pl-[22px] text-base text-muted-foreground">{top.topicName}</p>

      {top.reasons.length > 0 && (
        <ul className="relative mt-4 flex flex-wrap gap-1.5">
          {top.reasons.map((reason) => (
            <li
              key={reason.code}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {reason.label}
            </li>
          ))}
        </ul>
      )}

      <p className="relative mt-4 text-xs text-muted-foreground">
        Sessão recomendada: <span className="font-medium text-foreground">~{suggestedMinutes[top.urgency]} minutos</span>
      </p>

      <Link
        href={`/sessions?subjectId=${top.subjectId}&topicId=${top.topicId}`}
        className={buttonVariants({ size: "lg", className: "relative mt-4 w-full" })}
      >
        <Play className="h-4 w-4" fill="currentColor" />
        Começar sessão
      </Link>

      {rest.length > 0 && (
        <div className="relative mt-5 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Depois disso</p>
          <ul className="space-y-1">
            {rest.map((item) => (
              <li key={item.topicId}>
                <Link
                  href={`/topics/${item.topicId}`}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.subjectColor }} />
                    <span className="truncate text-foreground">{item.topicName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.reasons[0]?.label ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
