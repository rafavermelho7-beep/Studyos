import { z } from "zod";

// Allowed values for the per-user "Aparência" settings (User.themeMode,
// accentColor, homePage, dashboardOrder/Hidden). The DB columns are plain
// strings so adding an option never needs a migration; anything unknown
// reads back as the default instead of crashing a page.

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

// Curated, not a free color picker: every accent is checked for WCAG AA
// (>= 4.5:1) as text on the surface and behind button text, in both
// themes. The CSS for each lives in src/app/accents.css (keep in sync —
// preferences.test.ts checks every key has a rule there). `swatch` is only
// for drawing the picker.
export const ACCENTS = {
  indigo: { label: "Índigo", swatch: "#5b5bd6" },
  blue: { label: "Azul", swatch: "#2563eb" },
  teal: { label: "Verde-água", swatch: "#0f766e" },
  green: { label: "Verde", swatch: "#15803d" },
  orange: { label: "Laranja", swatch: "#c2410c" },
  pink: { label: "Rosa", swatch: "#be185d" },
  violet: { label: "Violeta", swatch: "#7c3aed" },
  slate: { label: "Grafite", swatch: "#3f3f46" },
} as const;
export type AccentColor = keyof typeof ACCENTS;
export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentColor[];

export const BACKGROUND_STYLES = ["plain", "gradient", "photo"] as const;
export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

export const HOME_PAGES = {
  dashboard: { label: "Início", path: "/dashboard" },
  sessions: { label: "Sessão de estudo", path: "/sessions" },
  review: { label: "Revisão", path: "/review" },
  tasks: { label: "Tarefas", path: "/tasks" },
} as const;
export type HomePage = keyof typeof HOME_PAGES;

export const DASHBOARD_BLOCKS = {
  summary: "Resumo do dia",
  goal: "Meta do mês",
  focus: "Seu foco agora",
  neglected: "Matérias negligenciadas",
  lessons: "Últimas aulas",
  subjects: "Suas matérias",
} as const;
export type DashboardBlock = keyof typeof DASHBOARD_BLOCKS;
const DEFAULT_ORDER = Object.keys(DASHBOARD_BLOCKS) as DashboardBlock[];

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function readPreferences(user: {
  themeMode: string;
  accentColor: string;
  homePage: string;
  monthlyGoalMinutes: number | null;
  dashboardOrder: string[];
  dashboardHidden: string[];
  backgroundStyle: string;
  backgroundImageId: string | null;
}) {
  const backgroundStyle = pick(user.backgroundStyle, BACKGROUND_STYLES, "plain");
  return {
    // "photo" without a photo (e.g. it failed to save) degrades to plain.
    backgroundStyle: backgroundStyle === "photo" && !user.backgroundImageId ? "plain" : backgroundStyle,
    backgroundImageId: user.backgroundImageId,
    themeMode: pick(user.themeMode, THEME_MODES, "system"),
    accentColor: pick(user.accentColor, ACCENT_KEYS, "indigo"),
    homePage: pick(user.homePage, Object.keys(HOME_PAGES) as HomePage[], "dashboard"),
    monthlyGoalMinutes: user.monthlyGoalMinutes,
    dashboard: resolveDashboardLayout(user.dashboardOrder, user.dashboardHidden),
  };
}

export function homePath(homePage: string) {
  return HOME_PAGES[pick(homePage, Object.keys(HOME_PAGES) as HomePage[], "dashboard")].path;
}

/**
 * The user's saved order, minus unknown ids, with any block they've never
 * seen (added in a later release) slotted back in at its default position.
 */
export function resolveDashboardLayout(order: string[], hidden: string[]) {
  const known = order.filter((id, i): id is DashboardBlock => id in DASHBOARD_BLOCKS && order.indexOf(id) === i);
  const result = [...known];
  DEFAULT_ORDER.forEach((id, defaultIndex) => {
    if (result.includes(id)) return;
    // Insert right after the nearest block that precedes it by default.
    const before = DEFAULT_ORDER.slice(0, defaultIndex).reverse().find((b) => result.includes(b));
    result.splice(before ? result.indexOf(before) + 1 : 0, 0, id);
  });
  return result.map((id) => ({ id, label: DASHBOARD_BLOCKS[id], visible: !hidden.includes(id) }));
}

export const appearanceSchema = z.object({
  themeMode: z.enum(THEME_MODES),
  accentColor: z.enum(ACCENT_KEYS as [AccentColor, ...AccentColor[]]),
  homePage: z.enum(Object.keys(HOME_PAGES) as [HomePage, ...HomePage[]]),
});

export const monthlyGoalSchema = z
  .number()
  .int()
  .min(1, "Meta mínima de 1 hora")
  .max(744, "Um mês tem no máximo 744 horas")
  .nullable();

export const dashboardLayoutSchema = z
  .array(z.object({ id: z.enum(DEFAULT_ORDER as [DashboardBlock, ...DashboardBlock[]]), visible: z.boolean() }))
  .refine((blocks) => new Set(blocks.map((b) => b.id)).size === blocks.length, "Bloco repetido")
  .refine((blocks) => blocks.some((b) => b.visible), "Deixe pelo menos um bloco visível");

export const backgroundStyleSchema = z.enum(BACKGROUND_STYLES);
