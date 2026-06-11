import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import {
  fetchBackend,
  getBackendBaseUrl,
  parseBackendResponse,
} from "@/lib/api/backend";
import {
  accessCookieName,
  clearAuthCookies,
  refreshCookieName,
  setAuthCookies,
} from "@/lib/auth/cookies";
import {
  hasPermission,
  isAdminUser,
  type AdminPermission,
  type AdminUser,
} from "@/lib/auth/permissions";

type RefreshResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; status: number; payload: unknown };

type SessionResult =
  | {
      ok: true;
      user: AdminUser;
      accessToken: string;
      nextTokens?: { accessToken: string; refreshToken: string };
    }
  | {
      ok: false;
      status: number;
      payload: unknown;
      clearAuth?: boolean;
    };

const jsonHeaders = {
  "Content-Type": "application/json",
};

function unauthenticatedPayload(message = "Admin session is missing.") {
  return {
    statusCode: 401,
    code: "UNAUTHENTICATED",
    message,
  };
}

function forbiddenPayload() {
  return {
    statusCode: 403,
    code: "ADMIN_ACCESS_REQUIRED",
    message: "This account does not have admin panel access.",
  };
}

export async function refreshAdminTokens(
  refreshToken: string,
): Promise<RefreshResult> {
  const result = await fetchBackend(
    `${getBackendBaseUrl()}/v1/auth/refresh`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      status: 503,
      payload: unauthenticatedPayload(
        result.reason === "timeout"
          ? "Auth service timed out."
          : "Auth service is unreachable.",
      ),
    };
  }

  const response = result.response;
  const payload = (await parseBackendResponse(response)) as
    | { accessToken?: string; refreshToken?: string }
    | null;

  if (!response.ok || !payload?.accessToken || !payload.refreshToken) {
    return { ok: false, status: response.status, payload };
  }

  return {
    ok: true,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

async function fetchCurrentAdmin(accessToken: string): Promise<SessionResult> {
  const result = await fetchBackend(`${getBackendBaseUrl()}/v1/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 503,
      payload: unauthenticatedPayload(
        result.reason === "timeout"
          ? "Session lookup timed out."
          : "Session lookup is unreachable.",
      ),
      clearAuth: true,
    };
  }

  const response = result.response;
  const payload = (await parseBackendResponse(response)) as AdminUser | null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
      clearAuth: response.status === 401,
    };
  }

  if (!isAdminUser(payload)) {
    return {
      ok: false,
      status: 403,
      payload: forbiddenPayload(),
    };
  }

  return { ok: true, user: payload, accessToken };
}

export async function resolveAdminSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessCookieName)?.value;
  const refreshToken = cookieStore.get(refreshCookieName)?.value;

  if (accessToken) {
    const current = await fetchCurrentAdmin(accessToken);
    if (current.ok === true) return current;

    if (current.status !== 401 || !refreshToken) {
      return current;
    }
  }

  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      payload: unauthenticatedPayload(),
      clearAuth: Boolean(accessToken),
    };
  }

  const refreshed = await refreshAdminTokens(refreshToken);
  if (refreshed.ok === false) {
    return {
      ok: false,
      status: refreshed.status || 401,
      payload: refreshed.payload ?? unauthenticatedPayload("Refresh token is invalid."),
      clearAuth: true,
    };
  }

  const current = await fetchCurrentAdmin(refreshed.accessToken);
  if (current.ok === false) {
    return { ...current, clearAuth: true };
  }

  return {
    ok: true,
    user: current.user,
    accessToken: refreshed.accessToken,
    nextTokens: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    },
  };
}

export function applySessionCookies(response: NextResponse, session: SessionResult) {
  if (session.ok === true && session.nextTokens) {
    setAuthCookies(response, session.nextTokens);
  }

  if (session.ok === false && session.clearAuth) {
    clearAuthCookies(response);
  }

  return response;
}

/**
 * Server-side permission gate for any `(admin)` page.
 * - Unauthenticated → redirect to /login?next=<current path>
 * - Authenticated but missing permission → 404 (avoids leaking the route exists)
 * - Otherwise returns the resolved AdminUser so the page can render
 */
export async function requirePagePermission(
  permission: AdminPermission,
): Promise<AdminUser> {
  const session = await resolveAdminSession();

  if (!session.ok) {
    const headerStore = await headers();
    const pathname =
      headerStore.get("x-pathname") ??
      headerStore.get("x-invoke-path") ??
      headerStore.get("next-url") ??
      "/";
    const nextParam = encodeURIComponent(pathname);
    redirect(`/login?next=${nextParam}`);
  }

  if (!hasPermission(session.user, permission)) {
    notFound();
  }

  return session.user;
}
