import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  fetchBackend,
  getBackendBaseUrl,
  isStreamableResponse,
  parseBackendResponse,
  streamBackendResponse,
} from "@/lib/api/backend";
import {
  accessCookieName,
  clearAuthCookies,
  refreshCookieName,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { refreshAdminTokens } from "@/lib/auth/server-session";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function jsonResponse(payload: unknown, status: number) {
  return NextResponse.json(payload, { status });
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function buildForwardHeaders(request: Request, accessToken: string) {
  const headers = new Headers();
  const passthroughHeaders = [
    "accept",
    "accept-language",
    "content-type",
    "x-request-id",
    "x-idempotency-key",
  ];
  passthroughHeaders.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

async function forwardWithAuth(
  request: Request,
  accessToken: string,
  body: ArrayBuffer | undefined,
  nextTokens?: { accessToken: string; refreshToken: string },
) {
  const result = await fetchBackend(
    `${getBackendBaseUrl()}/v1/admin/counts`,
    {
      method: request.method,
      headers: buildForwardHeaders(request, accessToken),
      body,
      cache: "no-store",
    },
  );

  if (!result.ok) {
    return jsonResponse(
      {
        statusCode: 503,
        code: "BACKEND_UNREACHABLE",
        message:
          result.reason === "timeout"
            ? "Counts request timed out."
            : "Counts service is unreachable.",
      },
      503,
    );
  }

  const response = result.response;
  if (isStreamableResponse(response)) {
    return streamBackendResponse(response);
  }

  const payload = await parseBackendResponse(response);
  const jsonResult = jsonResponse(payload, response.status);
  if (nextTokens) setAuthCookies(jsonResult, nextTokens);
  if (response.status === 401) clearAuthCookies(jsonResult);
  return jsonResult;
}

export async function GET(request: Request) {
  if (unsafeMethods.has(request.method) && !isSameOriginRequest(request)) {
    return jsonResponse(
      { statusCode: 403, code: "CSRF_ORIGIN_BLOCKED", message: "..." },
      403,
    );
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(accessCookieName)?.value;
  const refreshToken = cookieStore.get(refreshCookieName)?.value;

  if (!accessToken && refreshToken) {
    const refreshed = await refreshAdminTokens(refreshToken);
    if (refreshed.ok) {
      accessToken = refreshed.accessToken;
      return forwardWithAuth(request, accessToken, undefined, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      });
    }
  }

  if (!accessToken) {
    return jsonResponse(
      { statusCode: 401, code: "UNAUTHENTICATED", message: "..." },
      401,
    );
  }

  return forwardWithAuth(request, accessToken, undefined);
}
