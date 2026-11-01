"use server";
// Server Actions: toda mutação iniciada pelo usuário passa por aqui.
// Cada action revalida a sessão (requireOwner), valida a entrada (zod) e audita.

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { audit } from "@/lib/governance/audit";
import { DOMAIN_KEYS } from "@/lib/domains";
import { MEMORY_KINDS, SENSITIVITY } from "@/lib/memory/policy";
import { localDate, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/env";
import { createCalendarEvent, syncCalendar } from "@/lib/services/calendar";
import { googleConfig, revokeToken } from "@/lib/google/calendar";
import { encryptionKey, unseal } from "@/lib/crypto";

export type ActionResult = { ok: true; message?: string; data?: Record<string, unknown> } | { ok: false; error: string };

const domain = z.enum(DOMAIN_KEYS).nullable().optional();
const optDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

function fd(form: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) o[k] = typeof v === "string" ? v : undefined;
  for (const k of Object.keys(o)) if (o[k] === "") o[k] = null;
  return o;
}

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: "Dados inválidos: " + e.issues.map((i) => i.path.join(".")).join(", ") };
  return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado" };
}

function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

// ------------------------------------------------------------------ auth
export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Informe e-mail e senha." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Credenciais inválidas." };
  if (!isOwner(data.user?.email)) {
    // Conta válida no Supabase, mas não é o dono: encerra a sessão imediatamente.
    await supabase.auth.signOut();
    return { ok: false, error: "Esta conta não tem acesso a este sistema." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ------------------------------------------------------------------ objetivos
const goalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  why: z.string().trim().max(1000).nullable().optional(),
  domain,
  horizon: z.enum(["quarter", "year", "multi_year"]).default("year"),
  target_date: optDate,
});

export async function createGoal(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const v = goalSchema.parse(fd(form));
    const { data, error } = await supabase
      .from("goals")
      .insert({ ...v, description: v.description ?? "", why: v.why ?? "" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "goal.create", "goal", data.id);
    refresh("/goals", "/");
    return { ok: true, message: "Objetivo criado." };
  } catch (e) {
    return fail(e);
  }
}

const goalUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "paused", "done", "dropped"]).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});

export async function updateGoal(input: z.input<typeof goalUpdate>): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const { id, ...patch } = goalUpdate.parse(input);
    const { error } = await supabase.from("goals").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "goal.update", "goal", id, patch);
    refresh("/goals", "/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ projetos
const projectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  domain,
  next_action: z.string().trim().max(300).nullable().optional(),
  due_date: optDate,
});

export async function createProject(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const v = projectSchema.parse(fd(form));
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...v, description: v.description ?? "", next_action: v.next_action ?? "" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "project.create", "project", data.id);
    refresh("/goals", "/");
    return { ok: true, message: "Projeto criado." };
  } catch (e) {
    return fail(e);
  }
}

const projectUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["planned", "active", "paused", "done", "dropped"]).optional(),
  next_action: z.string().trim().max(300).optional(),
});

export async function updateProject(input: z.input<typeof projectUpdate>): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const { id, ...patch } = projectUpdate.parse(input);
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "project.update", "project", id, patch);
    refresh("/goals", "/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ decisões de vida
const decisionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  context: z.string().trim().max(3000).nullable().optional(),
  options: z.string().trim().max(3000).nullable().optional(),
  decision: z.string().trim().max(2000).nullable().optional(),
  rationale: z.string().trim().max(3000).nullable().optional(),
  domain,
  decided_on: optDate,
  review_on: optDate,
});

export async function createDecision(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const v = decisionSchema.parse(fd(form));
    const { data, error } = await supabase
      .from("life_decisions")
      .insert({
        ...v,
        context: v.context ?? "",
        options: v.options ?? "",
        decision: v.decision ?? "",
        rationale: v.rationale ?? "",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "decision.create", "life_decision", data.id);
    refresh("/goals");
    return { ok: true, message: "Decisão registrada." };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ propostas do agente
export async function resolveProposal(id: string, accept: boolean): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    z.string().uuid().parse(id);
    const { data: p, error } = await supabase.from("proposals").select("*").eq("id", id).eq("status", "pending").single();
    if (error || !p) throw new Error("Proposta não encontrada ou já resolvida.");
    const payload = p.payload as Record<string, string | number | null>;
    let createdId: string | null = null;
    if (accept) {
      if (p.type === "create_goal") {
        const v = goalSchema.parse({ ...payload, horizon: payload.horizon ?? "year" });
        const r = await supabase.from("goals").insert({ ...v, description: v.description ?? "", why: v.why ?? "" }).select("id").single();
        if (r.error) throw new Error(r.error.message);
        createdId = r.data.id;
      } else if (p.type === "create_project") {
        const v = projectSchema.parse({ title: payload.title, description: payload.description, domain: payload.domain });
        const r = await supabase.from("projects").insert({ ...v, description: v.description ?? "", next_action: "" }).select("id").single();
        if (r.error) throw new Error(r.error.message);
        createdId = r.data.id;
      } else if (p.type === "create_calendar_event") {
        // Ação externa: só acontece aqui, após o clique "Aceitar" (DEC-T20).
        const v = calendarEventSchema.parse({ title: payload.title, start: payload.start, duration_minutes: payload.duration_minutes ?? null });
        const r = await createCalendarEvent(supabase, owner.timezone, { title: v.title, start: v.start, durationMinutes: v.duration_minutes });
        createdId = r.id;
      } else if (p.type === "record_decision") {
        const r = await supabase
          .from("life_decisions")
          .insert({ title: payload.title, context: payload.description ?? "", rationale: payload.why ?? "", domain: payload.domain ?? null, decided_on: localDate() })
          .select("id")
          .single();
        if (r.error) throw new Error(r.error.message);
        createdId = r.data.id;
      }
    }
    await supabase
      .from("proposals")
      .update({ status: accept ? "accepted" : "rejected", resolved_at: new Date().toISOString() })
      .eq("id", id);
    await audit(supabase, "user", accept ? "proposal.accept" : "proposal.reject", "proposal", id, { type: p.type, created: createdId });
    refresh("/", "/goals");
    return { ok: true, message: accept ? "Proposta aceita." : "Proposta descartada." };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ agenda (Google)
const calendarEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/),
  duration_minutes: z.coerce.number().int().min(5).max(600).nullable().optional(),
});

export async function syncCalendarNow(): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    const r = await syncCalendar(supabase, owner.timezone, { force: true });
    refresh("/", "/settings", "/context");
    return r.ok ? { ok: true, message: `Agenda sincronizada (${r.count} eventos).` } : { ok: false, error: r.error };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectCalendar(): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const { data } = await supabase.from("integrations").select("refresh_token_enc").eq("provider", "google_calendar").maybeSingle();
    const cfg = googleConfig();
    const key = encryptionKey();
    if (data && cfg && key) {
      try {
        await revokeToken(cfg, unseal(data.refresh_token_enc, key)); // revoga no Google também
      } catch {
        /* segue com a remoção local */
      }
    }
    await supabase.from("calendar_events").delete().gte("day", "1900-01-01");
    await supabase.from("integrations").delete().eq("provider", "google_calendar");
    await audit(supabase, "user", "integration.disconnect", "google_calendar");
    refresh("/", "/settings", "/context");
    return { ok: true, message: "Agenda desconectada e cópia local apagada." };
  } catch (e) {
    return fail(e);
  }
}

export async function addCalendarEvent(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    const raw = fd(form);
    const start = raw.time ? `${raw.date}T${raw.time}` : String(raw.date ?? "");
    const v = calendarEventSchema.parse({ title: raw.title, start, duration_minutes: raw.duration_minutes ?? null });
    await createCalendarEvent(supabase, owner.timezone, { title: v.title, start: v.start, durationMinutes: v.duration_minutes });
    refresh("/", "/context");
    return { ok: true, message: "Evento criado na Google Agenda." };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ memória
const memorySchema = z.object({
  kind: z.enum(MEMORY_KINDS).default("fact"),
  content: z.string().trim().min(2).max(2000),
  domain,
  sensitivity: z.enum(SENSITIVITY).default("normal"),
  valid_until: optDate,
});

export async function addMemory(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const v = memorySchema.parse(fd(form));
    const kind = v.kind === "inference" || v.kind === "hypothesis" ? "fact" : v.kind;
    const { data, error } = await supabase
      .from("memories")
      .insert({ ...v, kind, source: "user_stated", status: "active", confidence: 1 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "memory.add", "memory", data.id);
    refresh("/memory");
    return { ok: true, message: "Memória registrada." };
  } catch (e) {
    return fail(e);
  }
}

const memoryAction = z.object({
  id: z.string().uuid(),
  action: z.enum(["confirm", "reject", "outdated", "restore", "pin", "unpin", "delete", "edit"]),
  content: z.string().trim().min(2).max(2000).optional(),
});

export async function memoryCommand(input: z.input<typeof memoryAction>): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const { id, action, content } = memoryAction.parse(input);
    if (action === "delete") {
      const { error } = await supabase.from("memories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: m } = await supabase.from("memories").select("kind, status").eq("id", id).single();
      if (!m) throw new Error("Memória não encontrada.");
      const patch: Record<string, unknown> = {};
      if (action === "confirm") {
        // Confirmar transforma hipótese em fato confirmado pelo usuário.
        Object.assign(patch, {
          status: "active",
          source: "user_confirmed",
          confidence: 0.95,
          ...(m.kind === "hypothesis" || m.kind === "inference" ? { kind: "fact" } : {}),
        });
      }
      if (action === "reject") patch.status = "rejected";
      if (action === "outdated") Object.assign(patch, { status: "outdated", valid_until: localDate() });
      if (action === "restore") Object.assign(patch, { status: "active", valid_until: null });
      if (action === "pin") patch.pinned = true;
      if (action === "unpin") patch.pinned = false;
      if (action === "edit") {
        if (!content) throw new Error("Conteúdo vazio.");
        Object.assign(patch, { content, source: "user_confirmed", confidence: 1 });
        if (m.kind === "hypothesis" || m.kind === "inference") patch.kind = "fact";
      }
      const { error } = await supabase.from("memories").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    }
    await audit(supabase, "user", `memory.${action}`, "memory", id);
    refresh("/memory", "/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ acompanhamento
const checkinSchema = z.object({
  energy: z.coerce.number().int().min(1).max(5).nullable().optional(),
  mood: z.coerce.number().int().min(1).max(5).nullable().optional(),
  sleep_quality: z.coerce.number().int().min(1).max(5).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export async function saveCheckin(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    const v = checkinSchema.parse(fd(form));
    const day = localDate(new Date(), owner.timezone);
    const { error } = await supabase
      .from("checkins")
      .upsert({ ...v, note: v.note ?? "", day }, { onConflict: "user_id,day" });
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "checkin.save", "checkin", day);
    refresh("/", "/context");
    return { ok: true, message: "Registro salvo." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveRatings(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    const week = weekStart(localDate(new Date(), owner.timezone));
    const rows = DOMAIN_KEYS.flatMap((d) => {
      const raw = form.get(`score_${d}`);
      if (raw === null || raw === "") return [];
      const score = z.coerce.number().int().min(0).max(10).parse(raw);
      return [{ domain: d, score, week_start: week }];
    });
    if (!rows.length) return { ok: false, error: "Avalie ao menos um domínio." };
    const { error } = await supabase.from("domain_ratings").upsert(rows, { onConflict: "user_id,domain,week_start" });
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "balance.rate", "domain_ratings", week, { count: rows.length });
    refresh("/", "/context");
    return { ok: true, message: "Equilíbrio da semana registrado." };
  } catch (e) {
    return fail(e);
  }
}

const examSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(120).nullable().optional(),
  kind: z.enum(["exam", "deadline", "presentation"]).default("exam"),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function addStudyEvent(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const v = examSchema.parse(fd(form));
    const { data, error } = await supabase.from("study_events").insert({ ...v, subject: v.subject ?? "" }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "study_event.add", "study_event", data.id);
    refresh("/context", "/");
    return { ok: true, message: "Evento registrado." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteStudyEvent(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    z.string().uuid().parse(id);
    const { error } = await supabase.from("study_events").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "study_event.delete", "study_event", id);
    refresh("/context");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ avisos
export async function setInsightStatus(id: string, status: "seen" | "dismissed" | "acted"): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    z.string().uuid().parse(id);
    z.enum(["seen", "dismissed", "acted"]).parse(status);
    const { error } = await supabase.from("insights").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", `insight.${status}`, "insight", id);
    refresh("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ espaços
const spaceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().max(500).nullable().optional(),
  domain,
});

export async function createSpace(_: unknown, form: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const { supabase } = await requireOwner();
    const v = spaceSchema.parse(fd(form));
    const { data, error } = await supabase
      .from("spaces")
      .insert({ ...v, purpose: v.purpose ?? "", kind: v.domain ? "domain" : "investigation" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
    await audit(supabase, "user", "space.create", "space", id);
  } catch (e) {
    return fail(e);
  }
  redirect(`/spaces/${id}`);
}

const spaceUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "archived"]).optional(),
  pinned: z.boolean().optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export async function updateSpace(input: z.input<typeof spaceUpdate>): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const { id, ...patch } = spaceUpdate.parse(input);
    const { error } = await supabase.from("spaces").update(patch).eq("id", id).neq("kind", "ambient");
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "space.update", "space", id, patch);
    refresh("/spaces", `/spaces/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ configurações
const profileSchema = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  timezone: z.string().trim().min(3).max(60).default("America/Sao_Paulo"),
  preferred_provider: z.enum(["anthropic", "openai"]).nullable().optional(),
});

export async function saveProfile(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase, owner } = await requireOwner();
    const v = profileSchema.parse(fd(form));
    try {
      new Intl.DateTimeFormat("en", { timeZone: v.timezone });
    } catch {
      return { ok: false, error: "Fuso horário inválido." };
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: v.display_name ?? "", timezone: v.timezone, preferred_provider: v.preferred_provider ?? null })
      .eq("id", owner.id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "profile.update", "profile", owner.id);
    refresh("/settings", "/");
    return { ok: true, message: "Preferências salvas." };
  } catch (e) {
    return fail(e);
  }
}

export async function createIngestToken(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    const name = z.string().trim().min(1).max(80).parse(form.get("name") || "iPhone");
    const token = "le_" + crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const { data, error } = await supabase.from("ingest_tokens").insert({ name, token_hash: hash }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "ingest_token.create", "ingest_token", data.id, { name });
    refresh("/settings");
    // O token só é mostrado uma vez; apenas o hash fica armazenado.
    return { ok: true, message: "Token criado. Copie agora: ele não será exibido de novo.", data: { token } };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeIngestToken(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireOwner();
    z.string().uuid().parse(id);
    const { error } = await supabase.from("ingest_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(supabase, "user", "ingest_token.revoke", "ingest_token", id);
    refresh("/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
