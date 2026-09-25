"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// App-wide "Excluído · Desfazer" toasts. Deletes are DEFERRED, not
// delete-then-recreate: the row is hidden immediately and the server action
// only runs once the toast expires (or is dismissed with ×). "Desfazer"
// just cancels the timer, so nothing is ever lost and no row has to be
// rebuilt with its cascades. The provider lives in the (app) layout, so
// the timer survives client-side navigation. If the tab goes to the
// background (phone locked, app switched) pending deletes are committed
// right away rather than risking the page being discarded mid-timer.
//
// Closing the tab within the window cancels the delete — the safe
// direction to fail in.

const DEFAULT_DURATION_MS = 6000;

type Toast = {
  key: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<unknown>;
  /** Runs when the toast leaves without its action being taken (timeout, ×, tab hidden). */
  onExpire?: () => void | Promise<unknown>;
  tone?: "default" | "danger";
};

type UndoContextValue = {
  showToast: (toast: Omit<Toast, "key"> & { durationMs?: number }) => void;
  scheduleDelete: (opts: { id: string; message: string; commit: () => Promise<unknown> }) => void;
  isPendingDelete: (id: string) => boolean;
};

const UndoContext = createContext<UndoContextValue | null>(null);

export function UndoToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const live = useRef(new Map<number, Toast>());
  const nextKey = useRef(0);

  const remove = useCallback((key: number) => {
    const timer = timers.current.get(key);
    if (timer) clearTimeout(timer);
    timers.current.delete(key);
    live.current.delete(key);
    setToasts((all) => all.filter((t) => t.key !== key));
  }, []);

  const expire = useCallback(
    (key: number) => {
      const toast = live.current.get(key);
      remove(key);
      void toast?.onExpire?.();
    },
    [remove],
  );

  const showToast = useCallback<UndoContextValue["showToast"]>(
    ({ durationMs = DEFAULT_DURATION_MS, ...toast }) => {
      const key = nextKey.current++;
      const full = { ...toast, key };
      live.current.set(key, full);
      timers.current.set(key, setTimeout(() => expire(key), durationMs));
      setToasts((all) => [...all.slice(-2), full]);
    },
    [expire],
  );

  const unhide = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const scheduleDelete = useCallback<UndoContextValue["scheduleDelete"]>(
    ({ id, message, commit }) => {
      setHidden((prev) => new Set(prev).add(id));
      showToast({
        message,
        actionLabel: "Desfazer",
        onAction: () => unhide(id),
        onExpire: async () => {
          try {
            await commit();
          } catch {
            unhide(id);
            showToast({ message: "Não foi possível excluir. Tente de novo.", tone: "danger" });
          }
        },
      });
    },
    [showToast, unhide],
  );

  const isPendingDelete = useCallback((id: string) => hidden.has(id), [hidden]);

  useEffect(() => {
    function flush() {
      if (document.visibilityState !== "hidden") return;
      for (const key of [...live.current.keys()]) expire(key);
    }
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [expire]);

  return (
    <UndoContext.Provider value={{ showToast, scheduleDelete, isPendingDelete }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.key}
            role="status"
            className="animate-fade-in-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground shadow-[var(--shadow-md)]"
          >
            <span className={toast.tone === "danger" ? "flex-1 text-danger" : "flex-1"}>{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={() => {
                  remove(toast.key);
                  void toast.onAction?.();
                }}
                className="shrink-0 font-semibold text-accent transition-opacity hover:underline active:opacity-70"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              onClick={() => expire(toast.key)}
              aria-label="Fechar aviso"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </UndoContext.Provider>
  );
}

export function useUndoToast() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndoToast must be used inside <UndoToastProvider>.");
  return ctx;
}

/** Renders nothing while `id` is waiting out its undo window. For server-rendered rows. */
export function HideIfPendingDelete({ id, children }: { id: string; children: React.ReactNode }) {
  const { isPendingDelete } = useUndoToast();
  return isPendingDelete(id) ? null : children;
}
