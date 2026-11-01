// Cliente mínimo da Google Calendar API v3 + OAuth 2.0 (fetch puro, sem SDK pesado).
// Escopo único: calendar.events (ler e criar eventos). Endereços base configuráveis
// apenas para testes (dublê local); em produção usam os endpoints oficiais do Google.

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  apiBase: string;
}

export function googleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const testBase = env.NODE_ENV !== "production" || env.E2E_ALLOW_GOOGLE_MOCK === "1" ? env.GOOGLE_TEST_BASE_URL : undefined;
  return {
    clientId,
    clientSecret,
    authUrl: testBase ? `${testBase}/o/oauth2/v2/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: testBase ? `${testBase}/token` : "https://oauth2.googleapis.com/token",
    revokeUrl: testBase ? `${testBase}/revoke` : "https://oauth2.googleapis.com/revoke",
    apiBase: testBase ? `${testBase}/calendar/v3` : "https://www.googleapis.com/calendar/v3",
  };
}

export function buildAuthUrl(cfg: GoogleConfig, state: string, redirectUri: string): string {
  const u = new URL(cfg.authUrl);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GOOGLE_SCOPE);
  u.searchParams.set("access_type", "offline"); // refresh token
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

async function tokenRequest(cfg: GoogleConfig, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string };
  if (!res.ok || !json.access_token) throw new GoogleError(`token: ${json.error ?? res.status}`, res.status);
  return json;
}

export function exchangeCode(cfg: GoogleConfig, code: string, redirectUri: string) {
  return tokenRequest(cfg, { code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export function refreshAccessToken(cfg: GoogleConfig, refreshToken: string) {
  return tokenRequest(cfg, { refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function revokeToken(cfg: GoogleConfig, token: string) {
  await fetch(`${cfg.revokeUrl}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}

export class GoogleError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GoogleError";
  }
}

export interface RawEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string };
}

export async function listEvents(cfg: GoogleConfig, accessToken: string, calendarId: string, timeMin: string, timeMax: string): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const u = new URL(`${cfg.apiBase}/calendars/${encodeURIComponent(calendarId)}/events`);
    u.searchParams.set("timeMin", timeMin);
    u.searchParams.set("timeMax", timeMax);
    u.searchParams.set("singleEvents", "true");
    u.searchParams.set("orderBy", "startTime");
    u.searchParams.set("maxResults", "250");
    // Minimização: pede só os campos usados (sem participantes, descrição ou local).
    u.searchParams.set("fields", "items(id,status,summary,start,end),nextPageToken");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new GoogleError(`events.list: ${res.status}`, res.status);
    const json = (await res.json()) as { items?: RawEvent[]; nextPageToken?: string };
    out.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function insertEvent(cfg: GoogleConfig, accessToken: string, calendarId: string, body: EventBody): Promise<RawEvent> {
  const res = await fetch(`${cfg.apiBase}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new GoogleError(`events.insert: ${res.status}`, res.status);
  return (await res.json()) as RawEvent;
}

// ------------------------------------------------------------------ lógica pura

export interface NormalizedEvent {
  google_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  day: string;
}

/** Texto externo: remove controles e limita tamanho (é dado, não instrução). */
export function sanitizeTitle(s: string | undefined): string {
  return (s ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function normalizeEvent(e: RawEvent, tz: string): NormalizedEvent | null {
  if (!e.id || e.status === "cancelled" || !e.start) return null;
  const title = sanitizeTitle(e.summary) || "(sem título)";
  if (e.start.date) {
    return {
      google_id: e.id,
      title,
      start_at: `${e.start.date}T00:00:00Z`,
      end_at: e.end?.date ? `${e.end.date}T00:00:00Z` : null,
      all_day: true,
      day: e.start.date,
    };
  }
  if (!e.start.dateTime) return null;
  const start = new Date(e.start.dateTime);
  if (Number.isNaN(start.getTime())) return null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(start);
  return {
    google_id: e.id,
    title,
    start_at: start.toISOString(),
    end_at: e.end?.dateTime ? new Date(e.end.dateTime).toISOString() : null,
    all_day: false,
    day,
  };
}

/** Eventos que parecem provas/avaliações (alimentam UC-01 e conflitos de prazo). */
export function isExamTitle(title: string): boolean {
  return /\b(prova|exame|avalia[cç][aã]o|teste|p[1-4]|ap[1-4]|av[1-4]|simulado|qualifica[cç][aã]o|defesa|entrega de (tcc|trabalho))\b/i.test(title);
}

export interface EventBody {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}

/** Monta o corpo de criação. start: "YYYY-MM-DD" (dia inteiro) ou "YYYY-MM-DDTHH:MM" (hora local). */
export function buildEventBody(input: { title: string; start: string; durationMinutes?: number | null; timeZone: string }): EventBody {
  const summary = sanitizeTitle(input.title);
  if (!summary) throw new Error("título vazio");
  const description = "Criado pelo LIFE ENGINE com sua confirmação.";
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.start)) {
    const next = new Date(input.start + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    return { summary, description, start: { date: input.start }, end: { date: next.toISOString().slice(0, 10) } };
  }
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(input.start);
  if (!m) throw new Error("data/hora inválida");
  const dur = Math.min(600, Math.max(5, Math.round(input.durationMinutes ?? 60)));
  // Hora local "de parede" + timeZone: o Google resolve o fuso, sem conversões aqui.
  const [h, min] = [Number(m[2]), Number(m[3])];
  if (h > 23 || min > 59) throw new Error("hora inválida");
  const total = h * 60 + min + dur;
  const endDay = new Date(m[1] + "T12:00:00Z");
  endDay.setUTCDate(endDay.getUTCDate() + Math.floor(total / 1440));
  const endTime = `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return {
    summary,
    description,
    start: { dateTime: `${m[1]}T${m[2]}:${m[3]}:00`, timeZone: input.timeZone },
    end: { dateTime: `${endDay.toISOString().slice(0, 10)}T${endTime}:00`, timeZone: input.timeZone },
  };
}
