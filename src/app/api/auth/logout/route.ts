import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/api/backend";
import {
  accessCookieName,
  clearAuthCookies,
  refreshCookieName,
} from "@/lib/auth/cookies";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessCookieName)?.value;
  const refreshToken = cookieStore.get(refreshCookieName)?.value;

  if (accessToken || refreshToken) {
    await fetch(`${getBackendBaseUrl()}/v1/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
