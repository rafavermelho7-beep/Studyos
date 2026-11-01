import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ownerOrNull } from "@/lib/auth";
import { buildAuthUrl, googleConfig } from "@/lib/google/calendar";
import { googleRedirectUri } from "@/lib/google/redirect";
import { calendarSetupMissing } from "@/lib/services/calendar";

// Inicia o OAuth com o Google. "state" aleatório em cookie httpOnly protege contra CSRF.
export async function GET(req: Request) {
  const session = await ownerOrNull();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const cfg = googleConfig();
  if (!cfg || calendarSetupMissing().length) return NextResponse.redirect(new URL("/settings?google=unconfigured", req.url));
  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(buildAuthUrl(cfg, state, googleRedirectUri(req)));
  res.cookies.set("le_google_state", state, {
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/google",
    maxAge: 600,
  });
  return res;
}
