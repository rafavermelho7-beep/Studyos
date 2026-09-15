"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-[var(--radius-sm)] border-l-2 py-2 pr-3 pl-2.5 text-sm font-medium transition-[color,background-color,border-color] duration-200 ease-out",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110"
              strokeWidth={2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
