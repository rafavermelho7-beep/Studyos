import { NextResponse, type NextRequest } from "next/server";

// Cheap, edge-runtime redirect based on cookie presence only — this is a UX
// shortcut, NOT the authorization boundary. Every protected route still
// calls requireUser() (which hits the database) in its layout/page, because
// a present cookie doesn't prove the session is valid or unexpired.
const SESSION_COOKIE = "studyos_session";
const PUBLIC_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has(SESSION_COOKIE);

  if (PUBLIC_PATHS.includes(pathname) && hasCookie) {
    // "/" (not /dashboard) so the user's chosen start screen applies.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
