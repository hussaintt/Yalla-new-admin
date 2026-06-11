import { NextRequest, NextResponse } from "next/server";

import {
  fetchBackend,
  getBackendBaseUrl,
  isStreamableResponse,
  parseBackendResponse,
  streamBackendResponse,
} from "@/lib/api/backend";
import {
  applySessionCookies,
  resolveAdminSession,
} from "@/lib/auth/server-session";

const allowedSystemPaths = new Set([
  "health",
  "health/ready",
  "metrics",
  "docs/json",
  "docs/yaml",
]);

type SystemProxyContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: SystemProxyContext) {
  const session = await resolveAdminSession();

  if (session.ok === false) {
    return applySessionCookies(
      NextResponse.json(session.payload, { status: session.status }),
      session,
    );
  }

  const { path } = await context.params;
  const systemPath = path.map(encodeURIComponent).join("/");

  if (!allowedSystemPaths.has(systemPath)) {
    return NextResponse.json(
      {
        statusCode: 404,
        code: "SYSTEM_ENDPOINT_NOT_ALLOWED",
        message: "This system endpoint is not exposed through the admin panel.",
      },
      { status: 404 },
    );
  }

  const sourceUrl = new URL(request.url);
  const backendResult = await fetchBackend(
    `${getBackendBaseUrl()}/${systemPath}${sourceUrl.search}`,
    {
      headers: {
        Accept: request.headers.get("accept") ?? "*/*",
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!backendResult.ok) {
    return applySessionCookies(
      NextResponse.json(
        {
          statusCode: 503,
          code: "BACKEND_UNREACHABLE",
          message:
            backendResult.reason === "timeout"
              ? "System request timed out."
              : "System endpoint is unreachable.",
        },
        { status: 503 },
      ),
      session,
    );
  }

  const backendResponse = backendResult.response;
  const response = isStreamableResponse(backendResponse)
    ? streamBackendResponse(backendResponse)
    : NextResponse.json(await parseBackendResponse(backendResponse), {
        status: backendResponse.status,
      });

  return applySessionCookies(response, session);
}
