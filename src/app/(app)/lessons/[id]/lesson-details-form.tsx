"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateLessonAction } from "../actions";

export function LessonDetailsForm({
  lesson,
}: {
  // "YYYY-MM-DD", formatted on the server — the same timezone that parsed
  // it with parseISO. Formatting the Date here, in the browser's timezone,
  // would shift it a day back for anyone behind the server's (UTC) clock.
  lesson: { id: string; title: string; dateValue: string; notes: string | null };
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ error: string | null; saved: boolean }>({ error: null, saved: false });

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await updateLessonAction(lesson.id, formData);
          setStatus({ error: result.error, saved: !result.error });
          if (!result.error) setTimeout(() => setStatus((s) => ({ ...s, saved: false })), 1500);
        })
      }
      className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"
    >
      <div className="space-y-1.5">
        <Label htmlFor="lesson-title">Título</Label>
        <Input id="lesson-title" name="title" defaultValue={lesson.title} required maxLength={160} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lesson-date">Data</Label>
        <Input id="lesson-date" name="date" type="date" defaultValue={lesson.dateValue} required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="lesson-notes">Anotações da aula</Label>
        <Textarea
          id="lesson-notes"
          name="notes"
          rows={4}
          defaultValue={lesson.notes ?? ""}
          placeholder="O que foi dado, o que o professor enfatizou, o que cai na prova..."
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {status.saved && <span className="animate-fade-in-up text-xs text-success">✓ Salvo</span>}
        {status.error && <span role="alert" className="text-xs text-danger">{status.error}</span>}
      </div>
    </form>
  );
}
