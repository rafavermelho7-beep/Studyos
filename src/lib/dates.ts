// Utilitários de data sensíveis a fuso. O usuário é único; fuso padrão São Paulo.
export const DEFAULT_TZ = "America/Sao_Paulo";

/** Data local (YYYY-MM-DD) de um instante no fuso indicado. */
export function localDate(d: Date = new Date(), tz: string = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // en-CA => YYYY-MM-DD
}

/** Segunda-feira (YYYY-MM-DD) da semana da data local informada. */
export function weekStart(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + "T12:00:00Z");
  const db = Date.parse(b + "T12:00:00Z");
  return Math.round((db - da) / 86_400_000);
}

/** Primeiro dia do mês (YYYY-MM-01) da data local. */
export function monthStart(isoDate: string): string {
  return isoDate.slice(0, 8) + "01";
}

export function daysInMonth(isoDate: string): number {
  const [y, m] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function greetingFor(d: Date = new Date(), tz: string = DEFAULT_TZ): string {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(d),
  );
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatDatePt(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
