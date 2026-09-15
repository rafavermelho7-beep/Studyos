"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function UserMenu({ name, email }: { name: string | null; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name ?? email).charAt(0).toUpperCase();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent transition-all duration-150 hover:brightness-110 active:scale-95",
          open && "ring-2 ring-accent/40",
        )}
        aria-label="Menu do usuário"
      >
        {initial}
      </button>
      {open && (
        <div className="animate-scale-in absolute right-0 top-10 w-48 origin-top-right rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-lg">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-foreground">{name ?? "Você"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2"
          >
            <Settings className="h-4 w-4" /> Configurações
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
