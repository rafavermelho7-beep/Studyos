"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePresence } from "./presence";
import { RichText } from "./rich-text";

export interface Msg {
  id: string;
  role: "user" | "assistant" | "note";
  content: string;
  model?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string;
}

interface MemoryEvent {
  memories: { id: string; content: string; status: string; kind: string }[];
  proposals: { id: string; type: string; title: string }[];
}

const MODEL_LABEL: Record<string, string> = {
  "claude-haiku-5-5": "Haiku 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-opus-5-5": "Opus 5.5",
  "gpt-5.4-nano": "GPT-5.4 nano",
  "gpt-5.4-mini": "GPT-5.4 mini",
};

function brl(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n < 0.01 ? "< R$0,01" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Lê um corpo SSE e entrega eventos (event, data). */
async function readSSE(res: Response, onEvent: (event: string, data: unknown) => void) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = /^event: (.+)$/m.exec(chunk)?.[1];
      const data = /^data: (.+)$/m.exec(chunk)?.[1];
      if (ev && data) {
        try {
          onEvent(ev, JSON.parse(data));
        } catch {
          /* evento malformado: ignora */
        }
      }
    }
  }
}

export function Conversation({
  spaceId,
  initialMessages,
  variant = "space",
  placeholder = "Fale com o JARVIS…",
}: {
  spaceId: string | null;
  initialMessages: Msg[];
  variant?: "ambient" | "space";
  placeholder?: string;
}) {
  const presence = usePresence();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [route, setRoute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memEvent, setMemEvent] = useState<MemoryEvent | null>(null);
  const [expanded, setExpanded] = useState(variant === "space");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = streaming !== null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, expanded]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [draft]);

  // Atalho: "/" foca o comando de qualquer lugar; Esc recolhe no ambiente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && variant === "ambient" && !busy) setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, busy]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setError(null);
      setMemEvent(null);
      setDraft("");
      setExpanded(true);
      const tempId = "tmp-" + Date.now();
      setMessages((m) => [...m, { id: tempId, role: "user", content: message }]);
      setStreaming("");
      setRoute(null);
      presence.set("thinking");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let acc = "";
      let gotDone = false;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId, message }),
          signal: ctrl.signal,
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Erro ${res.status}`);
        }
        await readSSE(res, (event, data) => {
          const d = data as Record<string, unknown>;
          if (event === "route") {
            setRoute(MODEL_LABEL[String(d.model)] ?? String(d.label ?? d.model));
            presence.set("thinking", MODEL_LABEL[String(d.model)] ?? null);
          } else if (event === "delta") {
            if (!acc) presence.set("speaking");
            acc += String(d.t ?? "");
            setStreaming(acc);
          } else if (event === "done") {
            gotDone = true;
            setMessages((m) => [
              ...m,
              { id: String(d.messageId ?? "a-" + Date.now()), role: "assistant", content: acc, model: String(d.model ?? ""), meta: { cost_brl: d.costBRL } },
            ]);
            setStreaming(null);
            presence.set("acting", "memória");
          } else if (event === "memory") {
            setMemEvent(d as unknown as MemoryEvent);
          } else if (event === "error") {
            setError(String(d.message ?? "Falha."));
            presence.set("error");
          }
        });
        if (!gotDone && acc) {
          setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", content: acc }]);
        }
        if (gotDone) presence.set("standby");
        router.refresh();
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          if (acc) setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", content: acc + " …[interrompido]" }]);
          presence.set("standby");
        } else {
          setError((e as Error).message);
          presence.set("error");
        }
      } finally {
        setStreaming(null);
        abortRef.current = null;
      }
    },
    [busy, presence, router, spaceId],
  );

  const showThread = variant === "space" || expanded;
  const visible = messages.filter((m) => m.role !== "note");

  const thread = (
    <div className={variant === "space" ? "space-y-6 pb-4" : "space-y-6"}>
      {visible.length === 0 && !busy && (
        <div className="py-10 text-center text-[14px] text-text-3">
          Este espaço preserva o contexto da investigação. Comece descrevendo o que quer entender.
        </div>
      )}
      {visible.map((m) => (
        <MessageView key={m.id} m={m} />
      ))}
      {busy && (
        <div className="rise">
          <div className="label mb-2 flex items-center gap-2">
            JARVIS {route && <span className="normal-case tracking-normal text-text-3/80">· {route}</span>}
          </div>
          {streaming ? (
            <RichText text={streaming} className="caret text-[15px] leading-relaxed text-text-2" />
          ) : (
            <div className="flex gap-1.5 py-2" aria-label="Pensando">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal/70" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-[14px] text-danger">
          {error}
        </div>
      )}
      {memEvent && (memEvent.memories.length > 0 || memEvent.proposals.length > 0) && (
        <div className="rise flex flex-wrap items-center gap-2 text-[12.5px] text-text-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(262_80%_75%)]" />
          {memEvent.memories.length > 0 && (
            <Link href="/memory" className="hover:text-text-2">
              {memEvent.memories.length} memória(s) registrada(s)
              {memEvent.memories.some((x) => x.status === "proposed") ? " · algumas aguardam confirmação" : ""}
            </Link>
          )}
          {memEvent.proposals.length > 0 && (
            <Link href="/" className="text-warm/90 hover:text-warm">
              {memEvent.proposals.length} proposta(s) para você decidir
            </Link>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(draft);
      }}
      className="glass flex items-end gap-2 rounded-[22px] p-2 pl-4 shadow-[0_10px_50px_rgba(0,0,0,0.45)]"
    >
      <textarea
        ref={inputRef}
        value={draft}
        rows={1}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!busy) presence.set(e.target.value ? "listening" : "standby");
        }}
        onFocus={() => !busy && draft && presence.set("listening")}
        onBlur={() => !busy && presence.state === "listening" && presence.set("standby")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send(draft);
          }
        }}
        placeholder={placeholder}
        aria-label="Mensagem para o JARVIS"
        maxLength={8000}
        className="max-h-[180px] min-h-[24px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-text outline-none placeholder:text-text-3"
      />
      {busy ? (
        <button
          type="button"
          onClick={() => abortRef.current?.abort()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-2 text-text-2 hover:text-text"
          aria-label="Interromper"
        >
          <span className="h-3 w-3 rounded-[3px] bg-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text text-bg transition-opacity disabled:opacity-25"
          aria-label="Enviar"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </form>
  );

  if (variant === "space") {
    return (
      <div className="flex flex-col">
        {thread}
        <div className="sticky bottom-[84px] z-20 mt-2">{composer}</div>
      </div>
    );
  }

  // Variante ambiente: o fio da conversa se expande sobre o ambiente (Workspace State).
  return (
    <>
      {showThread && (
        <div className="fixed inset-x-0 top-[56px] bottom-[150px] z-20 px-3 sm:px-8 fade-in">
          <div className="glass mx-auto flex h-full max-w-3xl flex-col rounded-3xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="label">Conversa contínua</span>
              <div className="flex items-center gap-1">
                <Link href="/spaces" className="rounded-full px-3 py-1 text-[12px] text-text-3 hover:text-text-2">
                  Abrir em espaço
                </Link>
                <button
                  onClick={() => setExpanded(false)}
                  disabled={busy}
                  className="rounded-full px-3 py-1 text-[12px] text-text-3 hover:text-text-2 disabled:opacity-30"
                  aria-label="Recolher conversa"
                >
                  Recolher · Esc
                </button>
              </div>
            </div>
            <div className="scrollbar-none flex-1 overflow-y-auto px-5 py-5">{thread}</div>
          </div>
        </div>
      )}
      <div className="fixed inset-x-0 bottom-[78px] z-30 px-3 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {!showThread && visible.length > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="mb-2 block w-full truncate text-left text-[12.5px] text-text-3 hover:text-text-2"
            >
              <span className="label mr-2">Última troca</span>
              {visible[visible.length - 1].content.slice(0, 140)}
            </button>
          )}
          {composer}
        </div>
      </div>
    </>
  );
}

function MessageView({ m }: { m: Msg }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white/[0.06] px-4 py-2.5 text-[15px] leading-relaxed text-text">
          {m.content}
        </div>
      </div>
    );
  }
  const cost = brl(m.meta?.cost_brl);
  return (
    <div>
      <div className="label mb-2">
        JARVIS
        {m.model && (
          <span className="normal-case tracking-normal text-text-3/70">
            {" "}· {MODEL_LABEL[m.model] ?? m.model}
            {cost ? ` · ${cost}` : ""}
          </span>
        )}
      </div>
      <RichText text={m.content} className="text-[15px] leading-relaxed text-text-2" />
    </div>
  );
}
