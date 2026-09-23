import { plural } from "@/lib/utils";

// Confirmation copy for deletes that cascade — spells out what goes away
// and, just as importantly, what doesn't (study hours are kept; see the
// SetNull relations in schema.prisma).

const KEEPS_HOURS = "As horas estudadas continuam nas estatísticas.";

export function subjectDeletionDetails(impact: {
  topics: number;
  exams: number;
  reviews: number;
  studyEvents: number;
  tasks: number;
}) {
  const gone = [
    impact.topics > 0 && plural(impact.topics, "tópico"),
    impact.exams > 0 && plural(impact.exams, "prova"),
    impact.reviews > 0 && `o histórico de revisão de ${plural(impact.reviews, "tópico")}`,
  ].filter((part): part is string => Boolean(part));
  const kept = [
    impact.studyEvents > 0 && KEEPS_HOURS,
    impact.tasks > 0 && `${plural(impact.tasks, "tarefa")} ${impact.tasks === 1 ? "fica" : "ficam"} sem matéria.`,
  ].filter((part): part is string => Boolean(part));

  return [
    gone.length > 0 ? `Isso apaga ${joinPt(gone)}.` : "Não há conteúdo dentro dela.",
    ...kept,
    "Não dá pra desfazer.",
  ].join(" ");
}

export function topicDeletionDetails(subtopics: number, inReview: boolean) {
  const gone = [
    subtopics > 0 && plural(subtopics, "subtópico"),
    inReview && "o histórico de revisão",
  ].filter((part): part is string => Boolean(part));
  return [gone.length > 0 && `Isso também apaga ${joinPt(gone)}.`, KEEPS_HOURS, "Não dá pra desfazer."]
    .filter(Boolean)
    .join(" ");
}

function joinPt(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}
