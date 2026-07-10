import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth for the whole app (pages + API routes).
 *
 * Enabled only when BOTH BASIC_AUTH_USER and BASIC_AUTH_PASS are set, so
 * local development keeps working without credentials. Scheduler endpoints
 * (publish cron, metrics refresh) are excluded — they have their own
 * CRON_SECRET bearer check, and Vercel Cron / external schedulers can't
 * send Basic Auth.
 */
export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!user || !pass) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/publish/cron") || path.startsWith("/api/metrics/refresh")) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [givenUser, givenPass] = atob(auth.slice(6)).split(":");
    if (givenUser === user && givenPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AutoX"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
