"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { COMMON_SOURCES, ERROR_REASONS, ERROR_REASON_KEYS, type ErrorReason } from "@/lib/error-review";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

type SubjectOption = { id: string; name: string; emoji: string | null };
type TopicOption = { id: string; name: string; subjectId: string };

export type ErrorFormDefaults = {
  subjectId: string | null;
  topicId: string | null;
  source: string | null;
  question: string | null;
  reason: string;
  lesson: string;
  hasPhoto: boolean;
};

const selectClass =
  "h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent";

/**
 * Used both to log a new error and to edit one. `onSubmit` is the bound
 * server action; for a new entry the form resets on success so the next
 * question can be logged right away.
 */
export function ErrorForm({
  subjects,
  topics,
  defaults,
  onSubmit,
  submitLabel,
}: {
  subjects: SubjectOption[];
  topics: TopicOption[];
  defaults?: ErrorFormDefaults;
  onSubmit: (formData: FormData) => Promise<{ error: string | null } | undefined>;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = useState(defaults?.subjectId ?? "");
  const [reason, setReason] = useState<string>(defaults?.reason ?? "");
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const subjectTopics = topics.filter((t) => t.subjectId === subjectId);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      // A question photo needs to stay legible, but not at 12 MP.
      const blob = await compressImage(file, 1600);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError("Não foi possível ler essa foto.");
    }
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        if (photo) formData.set("image", photo.blob, "questao");
        setError(null);
        startTransition(async () => {
          const result = await onSubmit(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          if (!defaults) {
            // Deliberate exception to the "reset quick-create forms at submit
            // time" convention (CLAUDE.md): this is a long form with server-side
            // validation, so it only clears once the save succeeded — a failed
            // save must not throw away the question the user just typed.
            formRef.current?.reset();
            setReason("");
            setPhoto(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="error-subject">Matéria</Label>
        <select
          id="error-subject"
          name="subjectId"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className={selectClass}
        >
          <option value="">Sem matéria</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji ? `${s.emoji} ` : ""}
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="error-topic">Tópico</Label>
        <select
          id="error-topic"
          name="topicId"
          defaultValue={defaults?.topicId ?? ""}
          key={subjectId /* reset when the subject changes */}
          disabled={subjectTopics.length === 0}
          className={selectClass}
        >
          <option value="">{subjectTopics.length === 0 ? "—" : "Sem tópico específico"}</option>
          {subjectTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="error-source">De onde é a questão</Label>
        <Input
          id="error-source"
          name="source"
          list="error-sources"
          defaultValue={defaults?.source ?? ""}
          maxLength={120}
          placeholder="Ex: MedCof, prova P2, residência USP 2024"
        />
        <datalist id="error-sources">
          {COMMON_SOURCES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="error-question">A questão</Label>
        <Textarea
          id="error-question"
          name="question"
          rows={3}
          defaultValue={defaults?.question ?? ""}
          placeholder="Cole ou resuma o enunciado — ou tire uma foto"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <Camera className="h-3.5 w-3.5" />
            {photo || defaults?.hasPhoto ? "Trocar foto da questão" : "Foto da questão"}
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Foto da questão"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          {photo && (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={photo.preview} alt="Prévia da foto" className="h-14 rounded-[var(--radius-sm)] border border-border" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label="Descartar foto"
                className="absolute -right-2 -top-2 rounded-full bg-surface p-0.5 shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {defaults?.hasPhoto && !photo && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="removePhoto" className="accent-[var(--accent)]" />
              Remover a foto atual
            </label>
          )}
        </div>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-foreground">Por que errei</legend>
        <div className="flex flex-wrap gap-1.5">
          {ERROR_REASON_KEYS.map((key) => (
            <label
              key={key}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                reason === key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name="reason"
                value={key}
                checked={reason === key}
                onChange={() => setReason(key as ErrorReason)}
                className="sr-only"
              />
              {ERROR_REASONS[key].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="error-lesson">O que aprendi</Label>
        <Textarea
          id="error-lesson"
          name="lesson"
          rows={2}
          required
          maxLength={2000}
          defaultValue={defaults?.lesson ?? ""}
          placeholder="A regra que você não pode esquecer — é isso que você vai reler antes da prova"
        />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        {saved && <span className="animate-fade-in-up text-xs text-success">✓ Erro registrado</span>}
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
