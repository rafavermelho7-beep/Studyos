import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const maxWidths = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
} as const;

/**
 * Generic loading.tsx content, reused across routes. Next renders this
 * instantly (before the route's data-fetching Server Component resolves)
 * so navigation never shows a blank flash on the real Supabase round-trip.
 */
export function PageSkeleton({
  maxWidth = "2xl",
  variant = "list",
  rows = 4,
}: {
  maxWidth?: keyof typeof maxWidths;
  variant?: "list" | "stats" | "dashboard" | "grid";
  rows?: number;
}) {
  return (
    <div className={cn("mx-auto animate-fade-in px-4 py-6 md:px-6", maxWidths[maxWidth])}>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />

      {variant === "dashboard" && (
        <>
          <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-[var(--radius-lg)]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-40 rounded-[var(--radius-xl)]" />
          <div className="stagger mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </>
      )}

      {variant === "stats" && (
        <>
          <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-[var(--radius-lg)]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 rounded-[var(--radius-lg)]" />
          <Skeleton className="mt-4 h-64 rounded-[var(--radius-lg)]" />
        </>
      )}

      {variant === "grid" && (
        <div className="stagger mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="stagger mt-6 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      )}
    </div>
  );
}
