import { NextRequest } from "next/server";

import { proxyAdminRequest } from "@/lib/api/backend-proxy";

type AdminProxyContext = {
  params: Promise<{ path: string[] }>;
};

async function handler(request: NextRequest, context: AdminProxyContext) {
  const { path } = await context.params;
  return proxyAdminRequest(request, path);
}

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
