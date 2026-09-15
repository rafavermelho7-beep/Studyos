"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryItems = navItems.filter((item) => item.primary);
  const restItems = navItems.filter((item) => !item.primary);
  const restActive = restItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <>
      {moreOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMoreOpen(false)}
          className="animate-fade-in fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px] transition-opacity md:hidden"
        />
      )}

      <div
        className={cn(
          "fixed inset-x-0 z-30 mx-3 rounded-[var(--radius-lg)] border border-border bg-surface p-2 shadow-lg transition-[opacity,transform] duration-200 ease-out md:hidden",
          "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
          moreOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <div className="grid grid-cols-3 gap-1">
          {restItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[var(--radius-sm)] py-2.5 text-[11px] font-medium transition-colors duration-150 active:scale-95",
                  active ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-surface-2",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primaryItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-[color,transform] duration-150 active:scale-95",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-label={moreOpen ? "Fechar mais opções" : "Mais opções"}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-[color,transform] duration-150 active:scale-95",
            moreOpen || restActive ? "text-accent" : "text-muted-foreground",
          )}
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <MoreHorizontal
              className={cn(
                "absolute h-5 w-5 transition-all duration-150",
                moreOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
              )}
              strokeWidth={2}
            />
            <X
              className={cn(
                "absolute h-5 w-5 transition-all duration-150",
                moreOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
              )}
              strokeWidth={2}
            />
          </span>
          Mais
        </button>
      </nav>
    </>
  );
}
