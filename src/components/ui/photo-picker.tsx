"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

// A button that opens the phone's camera/gallery picker (a plain
// accept="image/*" input — no `capture`, so the user can choose either),
// shrinks the photo in the browser, then hands it to a server action as
// FormData field "image" (read by lib/upload.ts).
export function PhotoPicker({
  label,
  maxDimension,
  upload,
  className,
  children,
}: {
  /** Accessible name / visible text while idle, e.g. "Adicionar capa". */
  label: string;
  /** Longest side after resizing — roughly the largest size it's displayed at. */
  maxDimension: number;
  upload: (formData: FormData) => Promise<{ error: string | null } | undefined>;
  className?: string;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await compressImage(file, maxDimension);
        const formData = new FormData();
        formData.append("image", blob, "photo");
        const result = await upload(formData);
        if (result?.error) setError(result.error);
      } catch {
        setError("Não foi possível ler essa imagem. Tente outra foto.");
      } finally {
        // Picking the same file again should still fire onChange.
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-[opacity,color] duration-150 disabled:opacity-60",
          className,
        )}
      >
        {children ?? (
          <>
            <ImagePlus className="h-3.5 w-3.5" />
            {label}
          </>
        )}
        {pending && <span className="text-xs">Enviando...</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid={`photo-input-${label}`}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
