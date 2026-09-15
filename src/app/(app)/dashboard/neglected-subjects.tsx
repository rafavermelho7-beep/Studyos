import Link from "next/link";
import type { NeglectedSubject } from "@/server/services/planning";

export function NeglectedSubjects({ subjects }: { subjects: NeglectedSubject[] }) {
  if (subjects.length === 0) return null;

  return (
    <div className="animate-fade-in-up mt-4 rounded-[var(--radius-lg)] border border-warning/30 bg-warning-soft p-3">
      <p className="text-xs font-medium text-warning">Matérias negligenciadas</p>
      <ul className="stagger mt-1.5 space-y-1">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <Link
              href={`/subjects/${subject.id}`}
              className="flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent hover:underline"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
              <span className="text-xs text-muted-foreground">
                {subject.daysSinceLastStudy === null
                  ? "— nunca estudada"
                  : `— há ${subject.daysSinceLastStudy} dias`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
