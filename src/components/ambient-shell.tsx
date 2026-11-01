"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PresenceProvider, usePresence } from "./presence";

const NAV = [
  { href: "/", label: "Ambiente", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" },
  { href: "/spaces", label: "Espaços", icon: "M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" },
  { href: "/goals", label: "Objetivos", icon: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" },
  { href: "/memory", label: "Memória", icon: "M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h3" },
  { href: "/context", label: "Contexto", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
  { href: "/settings", label: "Ajustes", icon: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3-2-1 .5-2.2-1.6-1.6L14.7 7 14 5h-4l-.7 2-2.2-.8-1.6 1.6L6 11l-2 1 2 1-.5 2.2 1.6 1.6 2.2-.8.7 2h4l.7-2 2.2.8 1.6-1.6L18 13Z" },
];

function TopBar({ budgetMode }: { budgetMode?: string }) {
  const { label, state } = usePresence();
  const dot =
    budgetMode === "blocked" ? "bg-danger" : budgetMode === "critical" ? "bg-warm" : budgetMode === "economy" ? "bg-warm/70" : "bg-ok/80";
  return (
    <header className="relative z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="LIFE ENGINE — início">
        <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]" />
        <span className="font-mono text-[11px] tracking-[0.32em] text-text-2">LIFE ENGINE</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="label hidden sm:inline" aria-live="polite">
          JARVIS · {state === "standby" ? "presente" : label.toLowerCase()}
        </span>
        <Link href="/context#orcamento" className="flex items-center gap-2" title="Orçamento de IA">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="label">IA</span>
        </Link>
      </div>
    </header>
  );
}

function Dock() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="glass fixed bottom-[max(env(safe-area-inset-bottom),12px)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
    >
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-10 items-center gap-2 rounded-full px-3 text-[13px] transition-all ${
              active ? "bg-white/[0.08] text-text" : "text-text-3 hover:text-text-2"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
              <path d={n.icon} />
            </svg>
            <span className={active ? "hidden md:inline" : "sr-only md:not-sr-only md:hidden md:group-hover:inline"}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AmbientShell({ children, budgetMode }: { children: React.ReactNode; budgetMode?: string }) {
  return (
    <PresenceProvider>
      <div className="ambient-field" aria-hidden />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <TopBar budgetMode={budgetMode} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-36 sm:px-8">{children}</main>
      </div>
      <Dock />
    </PresenceProvider>
  );
}
