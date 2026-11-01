import "server-only";
// Serviço de agenda: tokens cifrados, renovação, sincronização e criação (com confirmação).

import type { Supabase } from "@/lib/supabase/server";
import { encryptionKey, seal, unseal } from "@/lib/crypto";
import { addDays, localDate } from "@/lib/dates";
import { audit } from "@/lib/governance/audit";
import {
  buildEventBody,
  googleConfig,
  GoogleError,
  insertEvent,
  listEvents,
  normalizeEvent,
  refreshAccessToken,
} from "@/lib/google/calendar";

export type CalendarStatus =
  | { state: "unconfigured"; missing: string[] }
  | { state: "disconnected" }
  | { state: "connected"; lastSyncAt: string | null; status: string; lastError: string | null; accountEmail: string | null };

export function calendarSetupMissing(): string[] {
  const missing: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!encryptionKey()) missing.push("TOKEN_ENCRYPTION_KEY (32 bytes em base64)");
  return missing;
}

export async function calendarStatus(supabase: Supabase): Promise<CalendarStatus> {
  const missing = calendarSetupMissing();
  if (missing.length) return { state: "unconfigured", missing };
  const { data } = await supabase
    .from("integrations")
    .select("last_sync_at, status, last_error, account_email")
    .eq("provider", "google_calendar")
    .maybeSingle();
  if (!data) return { state: "disconnected" };
  return { state: "connected", lastSyncAt: data.last_sync_at, status: data.status, lastError: data.last_error, accountEmail: data.account_email };
}

/** Grava tokens recém-obtidos (cifrados). */
export async function storeTokens(
  supabase: Supabase,
  t: { refresh_token: string; access_token: string; expires_in: number; scope?: string; account_email?: string | null },
) {
  const key = encryptionKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY ausente ou inválida");
  const { error } = await supabase.from("integrations").upsert(
    {
      provider: "google_calendar",
      refresh_token_enc: seal(t.refresh_token, key),
      access_token_enc: seal(t.access_token, key),
      access_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
      scope: t.scope ?? "",
      account_email: t.account_email ?? null,
      status: "active",
      last_error: null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

async function accessToken(supabase: Supabase): Promise<{ token: string; calendarId: string } | null> {
  const cfg = googleConfig();
  const key = encryptionKey();
  if (!cfg || !key) return null;
  const { data } = await supabase
    .from("integrations")
    .select("refresh_token_enc, access_token_enc, access_expires_at, calendar_id")
    .eq("provider", "google_calendar")
    .maybeSingle();
  if (!data) return null;
  if (data.access_token_enc && data.access_expires_at && Date.parse(data.access_expires_at) > Date.now()) {
    return { token: unseal(data.access_token_enc, key), calendarId: data.calendar_id };
  }
  const refreshed = await refreshAccessToken(cfg, unseal(data.refresh_token_enc, key));
  await supabase
    .from("integrations")
    .update({
      access_token_enc: seal(refreshed.access_token, key),
      access_expires_at: new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString(),
      // O Google pode rotacionar o refresh token.
      ...(refreshed.refresh_token ? { refresh_token_enc: seal(refreshed.refresh_token, key) } : {}),
    })
    .eq("provider", "google_calendar");
  return { token: refreshed.access_token, calendarId: data.calendar_id };
}

async function markError(supabase: Supabase, e: unknown) {
  const msg =
    e instanceof GoogleError && (e.status === 400 || e.status === 401)
      ? "Acesso ao Google expirou ou foi revogado. Reconecte a agenda."
      : `Falha ao falar com o Google: ${(e as Error).message}`.slice(0, 300);
  await supabase.from("integrations").update({ status: "error", last_error: msg }).eq("provider", "google_calendar");
  return msg;
}

/** Sincroniza a janela [-30, +60] dias. Respeita intervalo mínimo salvo com force. */
export async function syncCalendar(supabase: Supabase, tz: string, opts: { force?: boolean; minIntervalMin?: number } = {}) {
  const cfg = googleConfig();
  if (!cfg) return { ok: false as const, error: "Google não configurado" };
  const { data: integ } = await supabase.from("integrations").select("last_sync_at").eq("provider", "google_calendar").maybeSingle();
  if (!integ) return { ok: false as const, error: "Agenda não conectada" };
  const min = opts.minIntervalMin ?? 30;
  if (!opts.force && integ.last_sync_at && Date.now() - Date.parse(integ.last_sync_at) < min * 60_000) {
    return { ok: true as const, skipped: true, count: 0 };
  }
  try {
    const at = await accessToken(supabase);
    if (!at) return { ok: false as const, error: "Agenda não conectada" };
    const today = localDate(new Date(), tz);
    const timeMin = new Date(addDays(today, -30) + "T00:00:00Z").toISOString();
    const timeMax = new Date(addDays(today, 61) + "T00:00:00Z").toISOString();
    const raw = await listEvents(cfg, at.token, at.calendarId, timeMin, timeMax);
    const events = raw.map((e) => normalizeEvent(e, tz)).filter((e): e is NonNullable<typeof e> => !!e);
    const syncedAt = new Date().toISOString();
    if (events.length) {
      const { error } = await supabase
        .from("calendar_events")
        .upsert(events.map((e) => ({ ...e, synced_at: syncedAt })), { onConflict: "user_id,google_id" });
      if (error) throw new Error(error.message);
    }
    // Remove da cópia local o que sumiu da agenda dentro da janela.
    await supabase.from("calendar_events").delete().gte("day", addDays(today, -30)).lt("synced_at", syncedAt);
    await supabase.from("integrations").update({ last_sync_at: syncedAt, status: "active", last_error: null }).eq("provider", "google_calendar");
    return { ok: true as const, skipped: false, count: events.length };
  } catch (e) {
    return { ok: false as const, error: await markError(supabase, e) };
  }
}

/** Cria evento na agenda. Só é chamado a partir de uma ação explícita do usuário. */
export async function createCalendarEvent(
  supabase: Supabase,
  tz: string,
  input: { title: string; start: string; durationMinutes?: number | null },
): Promise<{ id: string }> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Google não configurado");
  const today = localDate(new Date(), tz);
  if (input.start.slice(0, 10) < today) throw new Error("Não é possível criar evento no passado.");
  const body = buildEventBody({ ...input, timeZone: tz });
  const at = await accessToken(supabase);
  if (!at) throw new Error("Agenda não conectada.");
  let created;
  try {
    created = await insertEvent(cfg, at.token, at.calendarId, body);
  } catch (e) {
    throw new Error(await markError(supabase, e));
  }
  const norm = normalizeEvent(created, tz);
  if (norm) await supabase.from("calendar_events").upsert({ ...norm, created_by_engine: true }, { onConflict: "user_id,google_id" });
  await audit(supabase, "user", "calendar.create_event", "calendar_event", created.id, { title: body.summary, start: input.start });
  return { id: created.id };
}
