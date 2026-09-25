"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setLessonTopicsAction } from "../actions";

/** Chips for the subject's topics; tapping one links/unlinks it to this lesson. */
export function LessonTopics({
  lessonId,
  topics,
  selected,
}: {
  lessonId: string;
  topics: { id: string; name: string }[];
  selected: string[];
}) {
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(selected);

  if (topics.length === 0) {
    return <p className="text-xs text-muted-foreground">Esta matéria ainda não tem tópicos.</p>;
  }

  function toggle(id: string) {
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    startTransition(async () => {
      setCurrent(next);
      await setLessonTopicsAction(lessonId, next);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => {
        const on = current.includes(topic.id);
        return (
          <button
            key={topic.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(topic.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              on ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:border-border-strong",
            )}
          >
            {topic.name}
          </button>
        );
      })}
    </div>
  );
}
