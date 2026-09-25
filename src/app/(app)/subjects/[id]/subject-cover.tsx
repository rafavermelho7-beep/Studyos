"use client";

import { useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { imageUrl } from "@/lib/images";
import { removeSubjectCoverAction, setSubjectCoverAction } from "../actions";

export function SubjectCover({
  subjectId,
  subjectName,
  coverImageId,
}: {
  subjectId: string;
  subjectName: string;
  coverImageId: string | null;
}) {
  const [removing, startRemoving] = useTransition();
  const upload = setSubjectCoverAction.bind(null, subjectId);

  if (!coverImageId) {
    return (
      <div className="mb-4 flex flex-col items-start gap-1">
        <PhotoPicker
          label="Adicionar capa"
          maxDimension={1600}
          upload={upload}
          className="rounded-[var(--radius-sm)] border border-dashed border-border px-3 py-1.5 text-muted-foreground hover:border-accent hover:text-accent"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in mb-4">
      <div className="relative h-36 overflow-hidden rounded-[var(--radius-lg)] border border-border sm:h-44">
        {/* unoptimized: served by our own session-checked route, not a public URL the optimizer could fetch. */}
        <Image
          src={imageUrl(coverImageId)}
          alt={`Capa de ${subjectName}`}
          fill
          unoptimized
          sizes="(min-width: 768px) 720px, 100vw"
          className="object-cover"
        />
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          <PhotoPicker
            label="Trocar capa"
            maxDimension={1600}
            upload={upload}
            className="rounded-full bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm hover:bg-black/70"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Trocar
          </PhotoPicker>
          <button
            type="button"
            disabled={removing}
            onClick={() => startRemoving(() => removeSubjectCoverAction(subjectId))}
            aria-label="Remover capa"
            className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
