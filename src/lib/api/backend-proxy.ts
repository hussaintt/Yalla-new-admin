import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

type TokenPair = { accessToken: string; refreshToken: string };

type ForwardBody = ArrayBuffer | undefined;

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function jsonResponse(payload: unknown, status: number) {
  return NextResponse.json(payload, { status });
}

function backendUrl(path: string, search = "") {
  return `${getBackendBaseUrl()}/v1/${path.replace(/^\/+/, "")}${search}`;
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function requestBody(request: NextRequest): Promise<ForwardBody> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  return request.arrayBuffer();
}

function buildForwardHeaders(request: NextRequest, accessToken: string) {
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

async function forwardRequest(
  request: NextRequest,
  path: string,
  accessToken: string,
  body: ForwardBody,
) {
  const url = new URL(request.url);
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const logPath = path.replace(/^\/+/, "");

  const result = await fetchBackend(backendUrl(path, url.search), {
    method: request.method,
    headers: buildForwardHeaders(request, accessToken),
    body,
    cache: "no-store",
  });

  const durationMs = Date.now() - startedAt;

  if (!result.ok) {
    // Best-effort structured log for ops to scrape from stdout / log drain.
    console.info(
      "[bff]",
      JSON.stringify({
        method: request.method,
        path: `/${logPath}`,
        status: 503,
        durationMs,
        requestId,
        error: result.reason,
      }),
    );

    return new Response(
      JSON.stringify({
        statusCode: 503,
        code: "BACKEND_UNREACHABLE",
        message:
          result.reason === "timeout"
            ? "Backend request timed out."
            : "Backend is unreachable.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const response = result.response;
  console.info(
    "[bff]",
    JSON.stringify({
      method: request.method,
      path: `/${logPath}`,
      status: response.status,
      durationMs,
      requestId,
    }),
  );

  return response;
}

function unauthenticated() {
  return jsonResponse(
    {
      statusCode: 401,
      code: "UNAUTHENTICATED",
      message: "Admin session is missing.",
    },
    401,
  );
}

function csrfBlocked() {
  return jsonResponse(
    {
      statusCode: 403,
      code: "CSRF_ORIGIN_BLOCKED",
      message: "This admin request did not come from the current admin origin.",
    },
    403,
  );
}

async function buildProxyResponse(
  backendResponse: Response,
  nextTokens?: TokenPair,
) {
  let response: NextResponse;

  if (backendResponse.status === 204) {
    response = new NextResponse(null, { status: 204 });
  } else if (isStreamableResponse(backendResponse)) {
    response = streamBackendResponse(backendResponse);
  } else {
    const payload = await parseBackendResponse(backendResponse);
    response = jsonResponse(payload, backendResponse.status);
  }

  if (nextTokens) {
    setAuthCookies(response, nextTokens);
  }

  if (backendResponse.status === 401) {
    clearAuthCookies(response);
  }

  return response;
}

export async function proxyAdminRequest(
  request: NextRequest,
  pathSegments: string[],
) {
  if (unsafeMethods.has(request.method) && !isSameOriginRequest(request)) {
    return csrfBlocked();
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(accessCookieName)?.value;
  const refreshToken = cookieStore.get(refreshCookieName)?.value;
  const path = pathSegments.map(encodeURIComponent).join("/");
  const body = await requestBody(request);
  let nextTokens: TokenPair | undefined;

  if (!accessToken && refreshToken) {
    const refreshed = await refreshAdminTokens(refreshToken);
    if (refreshed.ok) {
      accessToken = refreshed.accessToken;
      nextTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
    }
  }

  if (!accessToken) {
    const response = unauthenticated();
    if (refreshToken) clearAuthCookies(response);
    return response;
  }

  let backendResponse = await forwardRequest(request, path, accessToken, body);

  if (backendResponse.status === 401 && refreshToken) {
    const refreshed = await refreshAdminTokens(refreshToken);

    if (refreshed.ok) {
      nextTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
      backendResponse = await forwardRequest(
        request,
        path,
        refreshed.accessToken,
        body,
      );
    }
  }

  return buildProxyResponse(backendResponse, nextTokens);
}
