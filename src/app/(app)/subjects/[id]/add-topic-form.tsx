"use client";

import { useRef, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTopicAction } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddTopicForm({ subjectId, parentId }: { subjectId: string; parentId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        // Reset synchronously at submit time — see quick-create-subject.tsx
        // for why resetting only after the action resolves is a data-loss
        // race on fast/repeated submits.
        formRef.current?.reset();
        startTransition(() => createTopicAction(formData));
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="subjectId" value={subjectId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <Input
        name="name"
        placeholder={parentId ? "Novo subtópico" : "Novo tópico (ex: Insuficiência cardíaca)"}
        required
        maxLength={160}
        className="text-sm"
      />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-label={parentId ? "Adicionar subtópico" : "Adicionar tópico"}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
