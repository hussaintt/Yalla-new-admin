import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies, refreshCookieName, setAuthCookies } from "@/lib/auth/cookies";
import { refreshAdminTokens } from "@/lib/auth/server-session";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(refreshCookieName)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      {
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "Refresh token is missing.",
      },
      { status: 401 },
    );
  }

  const refreshed = await refreshAdminTokens(refreshToken);

  if (refreshed.ok === false) {
    const response = NextResponse.json(refreshed.payload, {
      status: refreshed.status,
    });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  });

  return response;
}
