import Link from "next/link";
import { cn } from "@/lib/utils";

const presets = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "6 meses" },
  { value: "365", label: "1 ano" },
];

export function PeriodFilter({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {presets.map((p) => (
        <Link
          key={p.value}
          href={`/stats?period=${p.value}`}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            active === p.value
              ? "bg-accent-soft text-accent"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          {p.label}
        </Link>
      ))}
      <details className="relative">
        <summary
          className={cn(
            "cursor-pointer list-none rounded-full px-3 py-1 text-xs font-medium",
            active === "custom"
              ? "bg-accent-soft text-accent"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          Personalizado
        </summary>
        <form
          method="GET"
          action="/stats"
          className="absolute right-0 top-8 z-10 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-lg"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            De
            <input
              type="date"
              name="from"
              required
              className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Até
            <input
              type="date"
              name="to"
              required
              className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground"
            />
          </label>
          <button
            type="submit"
            className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
          >
            Aplicar
          </button>
        </form>
      </details>
    </div>
  );
}
