import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotebookPen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SubjectMark } from "@/components/ui/subject-mark";

type SummaryRow = {
  id: string;
  title: string;
  date: Date;
  notes: string | null;
  subject: { name: string; color: string; emoji: string | null };
};

/** First lines of the summary, "#" markers dropped, for the list preview. */
function preview(notes: string) {
  return notes.replace(/^\s*#{1,3}\s+/gm, "").replace(/\s+/g, " ").trim().slice(0, 220);
}

/** Server-rendered: dates format in the timezone they were parsed in. */
export function SummaryList({ summaries, query }: { summaries: SummaryRow[]; query: string }) {
  return (
    <div className="space-y-3">
      <form action="/lessons" className="relative">
        <input type="hidden" name="view" value="resumos" />
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={query} placeholder="Buscar nos resumos" aria-label="Buscar nos resumos" className="pl-8" />
      </form>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
          <NotebookPen className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            {query ? `Nenhum resumo com "${query}".` : "Nenhum resumo ainda. Abra uma aula e escreva o resumo dela."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {summaries.map((s) => (
            <li key={s.id}>
              <Link
                href={`/lessons/${s.id}`}
                className="block rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong"
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SubjectMark color={s.subject.color} emoji={s.subject.emoji} />
                  {s.subject.name} · {format(s.date, "d 'de' MMM", { locale: ptBR })}
                </span>
                <span className="mt-0.5 block text-sm font-medium text-foreground">{s.title}</span>
                <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview(s.notes ?? "")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
