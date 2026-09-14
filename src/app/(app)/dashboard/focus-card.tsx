import Link from "next/link";
import { Play } from "lucide-react";
import type { FocusRecommendation } from "@/server/services/planning";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const urgencyMeta = {
  alta: { icon: "🔴", label: "Alta prioridade", className: "bg-danger-soft text-danger" },
  media: { icon: "🟡", label: "Média prioridade", className: "bg-warning-soft text-warning" },
  baixa: { icon: "🟢", label: "Prioridade baixa", className: "bg-success-soft text-success" },
} as const;

const suggestedMinutes = { alta: 45, media: 30, baixa: 20 } as const;

export function FocusCard({ top, rest }: { top: FocusRecommendation; rest: FocusRecommendation[] }) {
  const urgency = urgencyMeta[top.urgency];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu foco agora</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", urgency.className)}>
          {urgency.icon} {urgency.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: top.subjectColor }} />
        <p className="text-lg font-semibold text-foreground">{top.subjectName}</p>
      </div>
      <p className="text-muted-foreground">{top.topicName}</p>

      {top.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {top.reasons.map((reason) => (
            <li key={reason.code} className="flex items-center gap-1.5 text-sm text-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              {reason.label}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Sessão recomendada: ~{suggestedMinutes[top.urgency]} minutos
      </p>

      <Link
        href={`/sessions?subjectId=${top.subjectId}&topicId=${top.topicId}`}
        className={buttonVariants({ className: "mt-4 w-full" })}
      >
        <Play className="h-4 w-4" />
        Começar sessão
      </Link>

      {rest.length > 0 && (
        <div className="mt-5 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Depois disso</p>
          <ul className="space-y-1.5">
            {rest.map((item) => (
              <li key={item.topicId}>
                <Link
                  href={`/topics/${item.topicId}`}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm hover:bg-surface-2"
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
