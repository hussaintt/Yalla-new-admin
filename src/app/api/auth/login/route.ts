import { NextRequest, NextResponse } from "next/server";

import {
  fetchBackend,
  getBackendBaseUrl,
  parseBackendResponse,
} from "@/lib/api/backend";
import { setAuthCookies } from "@/lib/auth/cookies";
import { isAdminUser, type AdminUser } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const credentials = await request.json();

  const loginResult = await fetchBackend(
    `${getBackendBaseUrl()}/v1/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    },
  );

  if (!loginResult.ok) {
    return NextResponse.json(
      {
        statusCode: 503,
        code: "AUTH_SERVICE_UNREACHABLE",
        message:
          loginResult.reason === "timeout"
            ? "Auth service timed out."
            : "Auth service is unreachable.",
      },
      { status: 503 },
    );
  }

  const loginResponse = loginResult.response;
  const loginPayload = (await parseBackendResponse(loginResponse)) as
    | {
        accessToken?: string;
        refreshToken?: string;
        [key: string]: unknown;
      }
    | null;

  if (!loginResponse.ok) {
    return NextResponse.json(loginPayload, { status: loginResponse.status });
  }

  if (!loginPayload?.accessToken || !loginPayload.refreshToken) {
    return NextResponse.json(
      {
        statusCode: 502,
        code: "INVALID_AUTH_RESPONSE",
        message: "Backend login response did not include tokens.",
      },
      { status: 502 },
    );
  }

  const meResult = await fetchBackend(`${getBackendBaseUrl()}/v1/me`, {
    headers: {
      Authorization: `Bearer ${loginPayload.accessToken}`,
    },
  });

  if (!meResult.ok) {
    return NextResponse.json(
      {
        statusCode: 503,
        code: "AUTH_SERVICE_UNREACHABLE",
        message:
          meResult.reason === "timeout"
            ? "Session lookup timed out."
            : "Session lookup is unreachable.",
      },
      { status: 503 },
    );
  }

  const meResponse = meResult.response;
  const user = (await parseBackendResponse(meResponse)) as AdminUser | null;

  if (!meResponse.ok || !isAdminUser(user)) {
    return NextResponse.json(
      {
        statusCode: 403,
        code: "ADMIN_ACCESS_REQUIRED",
        message: "This account does not have admin panel access.",
      },
      { status: 403 },
    );
  }

  const safeBody = { ...loginPayload };
  delete safeBody.accessToken;
  delete safeBody.refreshToken;
  const response = NextResponse.json({ ...safeBody, user });

  setAuthCookies(response, {
    accessToken: loginPayload.accessToken,
    refreshToken: loginPayload.refreshToken,
  });

  return response;
}
