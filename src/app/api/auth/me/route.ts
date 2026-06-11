import { NextResponse } from "next/server";

import {
  applySessionCookies,
  resolveAdminSession,
} from "@/lib/auth/server-session";

export async function GET() {
  const session = await resolveAdminSession();

  if (session.ok === false) {
    return applySessionCookies(
      NextResponse.json(session.payload, { status: session.status }),
      session,
    );
  }

  return applySessionCookies(NextResponse.json(session.user), session);
}
