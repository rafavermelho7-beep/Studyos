"use client";
// Presença do JARVIS: um estado global que colore o ambiente inteiro.
// Standby (respira devagar) · Listening (usuário digitando) · Thinking (aguardando o
// modelo) · Speaking (texto chegando) · Acting (registrando memória/propostas) · Error.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type PresenceState = "standby" | "listening" | "thinking" | "speaking" | "acting" | "error";

const STATE_STYLE: Record<PresenceState, { hue: number; energy: number; label: string }> = {
  standby: { hue: 172, energy: 0.35, label: "Em espera" },
  listening: { hue: 186, energy: 0.55, label: "Ouvindo" },
  thinking: { hue: 214, energy: 0.75, label: "Pensando" },
  speaking: { hue: 176, energy: 0.65, label: "Respondendo" },
  acting: { hue: 262, energy: 0.7, label: "Registrando" },
  error: { hue: 8, energy: 0.5, label: "Falha" },
};

interface PresenceCtx {
  state: PresenceState;
  label: string;
  detail: string | null;
  set: (s: PresenceState, detail?: string | null) => void;
}

const Ctx = createContext<PresenceCtx | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PresenceState>("standby");
  const [detail, setDetail] = useState<string | null>(null);

  const set = useCallback((s: PresenceState, d: string | null = null) => {
    setState(s);
    setDetail(d);
  }, []);

  useEffect(() => {
    const st = STATE_STYLE[state];
    document.documentElement.style.setProperty("--presence-hue", String(st.hue));
    document.documentElement.style.setProperty("--presence-energy", String(st.energy));
    if (state === "error") {
      const t = setTimeout(() => set("standby"), 6000);
      return () => clearTimeout(t);
    }
  }, [state, set]);

  const value = useMemo(() => ({ state, label: STATE_STYLE[state].label, detail, set }), [state, detail, set]);
  return <Ctx value={value}>{children}</Ctx>;
}

export function usePresence() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePresence fora do PresenceProvider");
  return c;
}

export function PresenceOrb({ size = 120, showLabel = false }: { size?: number; showLabel?: boolean }) {
  const { state, label, detail } = usePresence();
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="presence" data-state={state} style={{ ["--size" as string]: `${size}px` }} role="status" aria-label={`JARVIS: ${label}`}>
        <span className="ring" />
        <span className="ring r2" />
        <span className="arc" />
        <span className="arc a2" />
        <span className="core" />
      </div>
      {showLabel && (
        <div className="label h-4 transition-opacity" aria-live="polite">
          {label}
          {detail ? <span className="text-text-3/70 normal-case tracking-normal"> · {detail}</span> : null}
        </div>
      )}
    </div>
  );
}
