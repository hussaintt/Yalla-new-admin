import type { NextResponse } from "next/server";

export const accessCookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "yalla_admin_session";

export const refreshCookieName =
  process.env.ADMIN_REFRESH_COOKIE_NAME ?? "yalla_admin_refresh";

const isProduction = process.env.NODE_ENV === "production";

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookies.set(accessCookieName, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  response.cookies.set(refreshCookieName, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(accessCookieName, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(refreshCookieName, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
