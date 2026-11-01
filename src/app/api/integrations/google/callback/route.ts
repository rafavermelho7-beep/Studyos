import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ownerOrNull } from "@/lib/auth";
import { exchangeCode, googleConfig } from "@/lib/google/calendar";
import { googleRedirectUri } from "@/lib/google/redirect";
import { storeTokens, syncCalendar } from "@/lib/services/calendar";
import { audit } from "@/lib/governance/audit";

function done(req: Request, status: string) {
  const res = NextResponse.redirect(new URL(`/settings?google=${status}`, req.url));
  res.cookies.delete({ name: "le_google_state", path: "/api/integrations/google" });
  return res;
}

export async function GET(req: Request) {
  const session = await ownerOrNull();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const cfg = googleConfig();
  if (!cfg) return done(req, "unconfigured");
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return done(req, "denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)le_google_state=([^;]+)/)?.[1] ?? "";
  const valid =
    !!code && state.length > 0 && cookie.length === state.length && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookie));
  if (!valid) return done(req, "invalid_state");

  try {
    const tokens = await exchangeCode(cfg, code!, googleRedirectUri(req));
    if (!tokens.refresh_token) return done(req, "no_refresh");
    await storeTokens(session.supabase, {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    });
    await audit(session.supabase, "user", "integration.connect", "google_calendar");
    await syncCalendar(session.supabase, session.owner.timezone, { force: true });
    return done(req, "connected");
  } catch (e) {
    console.error("[google] callback:", (e as Error).message);
    return done(req, "error");
  }
}
