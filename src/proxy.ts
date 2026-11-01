import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOwner, supabaseConfig } from "@/lib/env";

// Proxy (antigo middleware): renova a sessão Supabase e faz a checagem otimista
// de acesso. A autorização definitiva ocorre na camada de dados (requireOwner) e no RLS.
const PUBLIC_PATHS = ["/login", "/setup", "/api/ingest"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const cfg = supabaseConfig();

  if (!cfg) {
    if (pathname === "/setup" || pathname.startsWith("/api/ingest")) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!isPublic && (!user || !isOwner(user.email))) {
    const url = new URL("/login", request.url);
    if (user && !isOwner(user.email)) url.searchParams.set("e", "forbidden");
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(url);
  }
  if (pathname === "/login" && user && isOwner(user.email)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
