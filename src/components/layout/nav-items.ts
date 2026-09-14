import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BookOpen, ListTodo, Timer, CalendarClock } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Only list routes that are fully functional (real data, no placeholders) —
// add an entry here in the same commit that ships the page.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/subjects", label: "Matérias", icon: BookOpen },
  { href: "/tasks", label: "Tarefas", icon: ListTodo },
  { href: "/sessions", label: "Sessão", icon: Timer },
  { href: "/exams", label: "Provas", icon: CalendarClock },
];
