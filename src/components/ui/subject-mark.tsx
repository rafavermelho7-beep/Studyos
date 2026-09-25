import { cn } from "@/lib/utils";

/** Inline marker next to a subject's name: its emoji, or its color dot when it has none. */
export function SubjectMark({
  color,
  emoji,
  size = "sm",
}: {
  color: string;
  emoji?: string | null;
  size?: "sm" | "lg";
}) {
  if (emoji) {
    return (
      <span aria-hidden className={cn("shrink-0 leading-none", size === "lg" ? "text-2xl" : "text-sm")}>
        {emoji}
      </span>
    );
  }
  return (
    <span
      className={cn("shrink-0 rounded-full", size === "lg" ? "h-3 w-3" : "h-1.5 w-1.5")}
      style={{ backgroundColor: color }}
    />
  );
}
