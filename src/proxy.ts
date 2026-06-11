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
  const hasAccessToken = Boolean(request.cookies.get(accessCookieName)?.value);
  const hasRefreshToken = Boolean(request.cookies.get(refreshCookieName)?.value);
  const hasSession = hasAccessToken || hasRefreshToken;

  if (publicPaths.includes(pathname) && hasSession) {
    return redirectWithNoStore(new URL("/dashboard", request.url));
  }

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
