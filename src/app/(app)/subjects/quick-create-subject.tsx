"use client";

import { useRef, useTransition } from "react";
import { Plus } from "lucide-react";
import { quickCreateSubjectAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function QuickCreateSubject() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        // Reset synchronously, at submit time — formData is already a
        // captured snapshot, unaffected by clearing the DOM form. Resetting
        // only after the action resolves left a window where fast/repeated
        // submits clobbered whatever the user had already typed for the
        // *next* entry, which then silently no-opped against server
        // validation (empty name). See PROJECT_STATUS.md's Fase 25 notes.
        formRef.current?.reset();
        startTransition(() => quickCreateSubjectAction(formData));
      }}
      className="flex gap-2"
    >
      <Input name="name" placeholder="Nome da matéria (ex: Cardiologia)" required maxLength={120} />
      <Button type="submit" disabled={pending}>
        <Plus className="h-4 w-4" />
        Adicionar
      </Button>
    </form>
  );
}
