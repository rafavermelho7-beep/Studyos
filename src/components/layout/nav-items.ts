import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  ListTodo,
  Timer,
  CalendarClock,
  Brain,
  BarChart3,
  Calendar,
  Network,
  Library,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Shown directly in the mobile bottom bar. Keep this to ~4 items (plus
  // the bar's own "Mais" button) — past that they stop fitting on a phone
  // screen without truncating/overflowing. Everything else still lives in
  // the desktop sidebar and the mobile "Mais" sheet.
  primary?: boolean;
};

// Only list routes that are fully functional (real data, no placeholders) —
// add an entry here in the same commit that ships the page.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard, primary: true },
  { href: "/sessions", label: "Sessão", icon: Timer, primary: true },
  { href: "/tasks", label: "Tarefas", icon: ListTodo, primary: true },
  { href: "/review", label: "Revisão", icon: Brain, primary: true },
  { href: "/subjects", label: "Matérias", icon: BookOpen },
  { href: "/schedule", label: "Cronograma", icon: Calendar },
  { href: "/exams", label: "Provas", icon: CalendarClock },
  { href: "/stats", label: "Estatísticas", icon: BarChart3 },
  { href: "/knowledge-map", label: "Mapa", icon: Network },
  { href: "/sources", label: "Fontes", icon: Library },
];
