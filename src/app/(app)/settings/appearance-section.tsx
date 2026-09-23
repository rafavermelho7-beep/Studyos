"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import {
  ACCENTS,
  ACCENT_KEYS,
  HOME_PAGES,
  type AccentColor,
  type BackgroundStyle,
  type DashboardBlock,
  type HomePage,
  type ThemeMode,
} from "@/lib/preferences";
import { applyAppearance } from "@/components/layout/appearance-sync";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { imageUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  removeBackgroundAction,
  saveAppearanceAction,
  saveDashboardLayoutAction,
  saveMonthlyGoalAction,
  setBackgroundStyleAction,
  uploadBackgroundAction,
} from "./appearance-actions";

type Props = {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  homePage: HomePage;
  monthlyGoalMinutes: number | null;
  dashboard: { id: DashboardBlock; label: string; visible: boolean }[];
  backgroundStyle: BackgroundStyle;
  backgroundImageId: string | null;
};

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

// Every control saves on change — no "Salvar" for the look-and-feel bits,
// since the result is visible immediately (applyAppearance previews it
// before the server round-trip lands).
export function AppearanceSection(props: Props) {
  return (
    <div id="aparencia" className="scroll-mt-20 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
      <div className="mt-4 space-y-6">
        <LookAndFeel {...props} />
        <BackgroundPicker style={props.backgroundStyle} imageId={props.backgroundImageId} />
        <MonthlyGoal initialMinutes={props.monthlyGoalMinutes} />
        <DashboardBlocks initial={props.dashboard} />
      </div>
    </div>
  );
}

function LookAndFeel({ themeMode, accentColor, homePage }: Props) {
  const [prefs, setPrefs] = useState({ themeMode, accentColor, homePage });
  const [, startTransition] = useTransition();

  function save(next: Partial<typeof prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    applyAppearance(merged.themeMode, merged.accentColor);
    startTransition(() => saveAppearanceAction(merged));
  }

  return (
    <>
      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">Tema</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={prefs.themeMode === value}
              onClick={() => save({ themeMode: value })}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors duration-150",
                prefs.themeMode === value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-foreground hover:border-border-strong",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">Cor de destaque</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ACCENT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={prefs.accentColor === key}
              aria-label={`Cor ${ACCENTS[key].label}`}
              title={ACCENTS[key].label}
              onClick={() => save({ accentColor: key })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95",
                prefs.accentColor === key && "ring-2 ring-foreground ring-offset-2 ring-offset-surface",
              )}
              style={{ backgroundColor: ACCENTS[key].swatch }}
            >
              {prefs.accentColor === key && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Tela que abre ao entrar no app</span>
        <select
          value={prefs.homePage}
          onChange={(e) => save({ homePage: e.target.value as HomePage })}
          className="mt-1.5 h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
        >
          {Object.entries(HOME_PAGES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

const backgroundOptions: { value: BackgroundStyle; label: string }[] = [
  { value: "plain", label: "Liso" },
  { value: "gradient", label: "Gradiente" },
  { value: "photo", label: "Foto" },
];

// Server state drives this one (no local copy): picking "Foto" before a
// photo exists opens the picker instead, and the upload itself switches
// the style — so what's highlighted is always what's actually saved.
function BackgroundPicker({ style, imageId }: { style: BackgroundStyle; imageId: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(value: BackgroundStyle) {
    setError(null);
    startTransition(async () => {
      const result = await setBackgroundStyleAction(value);
      if (result.error) setError(result.error);
    });
  }

  return (
    <fieldset>
      <legend className="text-xs font-medium text-muted-foreground">Fundo do app</legend>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {backgroundOptions.map(({ value, label }) => {
          const className = cn(
            "flex items-center justify-center rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors duration-150",
            style === value ? "border-accent bg-accent-soft text-accent" : "border-border text-foreground hover:border-border-strong",
          );
          if (value === "photo" && !imageId) {
            return (
              <PhotoPicker key={value} label="Foto" maxDimension={1920} upload={uploadBackgroundAction} className={className}>
                Foto
              </PhotoPicker>
            );
          }
          return (
            <button
              key={value}
              type="button"
              aria-pressed={style === value}
              disabled={pending}
              onClick={() => choose(value)}
              className={className}
            >
              {label}
            </button>
          );
        })}
      </div>
      {imageId && (
        <div className="mt-2 flex items-center gap-3">
          <span className="relative h-12 w-20 overflow-hidden rounded-[var(--radius-sm)] border border-border">
            <Image src={imageUrl(imageId)} alt="Foto de fundo atual" fill unoptimized sizes="80px" className="object-cover" />
          </span>
          <PhotoPicker
            label="Trocar foto de fundo"
            maxDimension={1920}
            upload={uploadBackgroundAction}
            className="text-accent hover:underline"
          >
            Trocar foto
          </PhotoPicker>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => removeBackgroundAction())}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover foto
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}

function MonthlyGoal({ initialMinutes }: { initialMinutes: number | null }) {
  const [hours, setHours] = useState(initialMinutes ? String(Math.round(initialMinutes / 60)) : "");
  const [saved, setSaved] = useState(initialMinutes !== null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(value: number | null) {
    startTransition(async () => {
      const result = await saveMonthlyGoalAction(value);
      setError(result.error);
      if (!result.error) {
        setSaved(value !== null);
        if (value === null) setHours("");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(Number(hours) || 0);
      }}
    >
      <label htmlFor="monthly-goal" className="text-xs font-medium text-muted-foreground">
        Meta do mês (horas de estudo, somando todas as matérias)
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          id="monthly-goal"
          type="number"
          inputMode="numeric"
          min={1}
          max={744}
          placeholder="ex: 60"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-28"
        />
        <span className="text-xs text-muted-foreground">horas</span>
        <Button type="submit" size="sm" disabled={pending || !hours}>
          {pending ? "Salvando..." : "Salvar meta"}
        </Button>
        {saved && (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => save(null)}>
            Remover
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </form>
  );
}

function DashboardBlocks({ initial }: { initial: Props["dashboard"] }) {
  const [blocks, setBlocks] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function update(next: Props["dashboard"]) {
    if (!next.some((b) => b.visible)) {
      setError("Deixe pelo menos um bloco visível.");
      return;
    }
    setError(null);
    setBlocks(next);
    startTransition(async () => {
      const result = await saveDashboardLayoutAction(next.map(({ id, visible }) => ({ id, visible })));
      if (result.error) setError(result.error);
    });
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...blocks];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update(next);
  }

  return (
    <fieldset>
      <legend className="text-xs font-medium text-muted-foreground">Blocos do Início (o que aparece e em que ordem)</legend>
      <ul className="mt-1.5 space-y-1">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-2.5 py-1.5"
          >
            <input
              type="checkbox"
              checked={block.visible}
              onChange={(e) => update(blocks.map((b) => (b.id === block.id ? { ...b, visible: e.target.checked } : b)))}
              aria-label={`Mostrar "${block.label}" no Início`}
              className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
            />
            <span className={cn("flex-1 text-sm", block.visible ? "text-foreground" : "text-muted-foreground line-through")}>
              {block.label}
            </span>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Subir "${block.label}"`}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === blocks.length - 1}
              aria-label={`Descer "${block.label}"`}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
