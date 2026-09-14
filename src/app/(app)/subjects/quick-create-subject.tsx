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
      action={(formData) => startTransition(() => quickCreateSubjectAction(formData).then(() => formRef.current?.reset()))}
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
