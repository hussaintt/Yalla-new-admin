import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { accessCookieName, refreshCookieName } from "@/lib/auth/cookies";

const publicPaths = ["/login"];

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function redirectWithNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(accessCookieName);
  const hasRefreshToken = request.cookies.has(refreshCookieName);
  const hasSession = hasAccessToken || hasRefreshToken;

  // If the user is trying to access a protected route and has no session, redirect to /login
  if (!publicPaths.includes(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithNoStore(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
