"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { COMMON_SOURCES, ERROR_REASONS, ERROR_REASON_KEYS } from "@/lib/error-review";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

type SubjectOption = { id: string; name: string; emoji: string | null };
type TopicOption = { id: string; name: string; subjectId: string };

export type ErrorFormDefaults = {
  subjectId: string | null;
  topicId: string | null;
  source: string | null;
  question: string | null;
  reason: string | null;
  lesson: string;
  hasPhoto: boolean;
};

const selectClass =
  "h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent";

/**
 * The notebook is about the CONCEPT that was missed — that's the one
 * required field and it comes first. Where the question came from, the
 * question itself (text/photo) and why it was missed are optional context,
 * folded under "Mais detalhes". Used for both new and edited entries.
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
  const [showDetails, setShowDetails] = useState(
    Boolean(defaults && (defaults.question || defaults.source || defaults.reason || defaults.hasPhoto)),
  );
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
            // time" convention (CLAUDE.md): server-side validation can fail,
            // and a failed save must not throw away what was just typed.
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
        <Label htmlFor="error-lesson">Conceito que errei</Label>
        <Textarea
          id="error-lesson"
          name="lesson"
          rows={3}
          required
          maxLength={2000}
          defaultValue={defaults?.lesson ?? ""}
          placeholder="O conceito certo, do jeito que você quer lembrar. Ex: Anemia ferropriva — 3–5 mg/kg/dia de ferro elementar"
        />
      </div>

      <div className="sm:col-span-2">
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showDetails && "rotate-180")} />
          Mais detalhes (opcional): questão, fonte, motivo
        </button>
      </div>

      {/* Hidden, not unmounted, so values survive toggling and still submit. */}
      <div className={cn("grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2", !showDetails && "hidden")}>
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
                  // Tapping the selected chip again clears it (it's optional).
                  onClick={() => reason === key && setReason("")}
                  onChange={() => setReason(key)}
                  className="sr-only"
                />
                {ERROR_REASONS[key].label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
        {saved && <span className="animate-fade-in-up text-xs text-success">✓ Conceito salvo</span>}
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
