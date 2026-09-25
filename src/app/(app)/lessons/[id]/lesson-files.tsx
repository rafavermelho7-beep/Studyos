"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { fileIcon } from "@/lib/file-icons";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { useUndoToast } from "@/components/ui/undo-toast";
import { formatBytes } from "@/lib/format-bytes";
import {
  deleteLessonAttachmentAction,
  finishLessonUploadAction,
  startLessonUploadAction,
} from "../actions";

type FileRow = { id: string; name: string; contentType: string | null; byteSize: number | null };

// Accept list shown by the picker; the server re-checks the real type anyway.
const ACCEPT =
  ".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,image/*," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Some phones (Android especially) report Office files with an empty or
 * generic type. Storage records the type the upload carries and the server
 * only accepts known ones, so fix it from the extension and re-wrap.
 */
function withReliableType(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file;
  const type = TYPE_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""];
  return type ? new File([file], file.name, { type }) : file;
}

/** PUT the file (storage-js's signed-upload format) with real progress — fetch can't report upload progress. */
function putWithProgress(url: string, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

type Upload = { key: string; name: string; progress: number; error: string | null };

export function LessonFiles({ lessonId, files }: { lessonId: string; files: FileRow[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const { isPendingDelete } = useUndoToast();
  const router = useRouter();

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((all) => all.map((u) => (u.key === key ? { ...u, ...change } : u)));

  async function uploadOne(picked: File, key: string) {
    const file = withReliableType(picked);
    const start = await startLessonUploadAction(lessonId, { name: file.name, size: file.size, type: file.type });
    if (start.error || !start.uploadUrl || !start.storagePath) return patch(key, { error: start.error ?? "Falha no envio." });
    try {
      await putWithProgress(start.uploadUrl, file, (progress) => patch(key, { progress }));
    } catch {
      return patch(key, { error: "O envio falhou. Verifique a conexão e tente de novo." });
    }
    const done = await finishLessonUploadAction(lessonId, { storagePath: start.storagePath, name: file.name });
    if (done.error) return patch(key, { error: done.error });
    setUploads((all) => all.filter((u) => u.key !== key));
  }

  async function onPick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    const batch = picked.map((file, i) => ({ file, key: `${Date.now()}-${i}` }));
    setUploads((all) => [...all, ...batch.map(({ file, key }) => ({ key, name: file.name, progress: 0, error: null }))]);
    // One at a time: phones on mobile data do better than with parallel uploads.
    for (const { file, key } of batch) await uploadOne(file, key);
    router.refresh();
  }

  const visible = files.filter((f) => !isPendingDelete(f.id));

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <Upload className="h-4 w-4" />
        Enviar slides, PDFs ou fotos
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        data-testid="lesson-file-input"
        onChange={(e) => onPick(e.target.files)}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        PDF abre direto no app. PowerPoint e Word são baixados — dica: exporte os slides como PDF. Até 50 MB por arquivo.
      </p>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {uploads.map((u) => (
            <li key={u.key} className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{u.name}</span>
                {!u.error && <span className="shrink-0 text-xs text-muted-foreground">{Math.round(u.progress * 100)}%</span>}
              </div>
              {u.error ? (
                <p role="alert" className="mt-1 text-xs text-danger">{u.error}</p>
              ) : (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${u.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {visible.length > 0 && (
        <ul className="stagger mt-3 space-y-1.5">
          {visible.map((file) => {
            const Icon = fileIcon(file.contentType);
            return (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong"
              >
                <Icon className="h-5 w-5 shrink-0 text-accent" />
                <a
                  href={`/api/lesson-files/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-foreground hover:underline">{file.name}</p>
                  {file.byteSize != null && <p className="text-xs text-muted-foreground">{formatBytes(file.byteSize)}</p>}
                </a>
                <UndoableDeleteButton
                  id={file.id}
                  label={`Excluir arquivo "${file.name}"`}
                  message="Arquivo excluído"
                  onDelete={() => deleteLessonAttachmentAction(file.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
