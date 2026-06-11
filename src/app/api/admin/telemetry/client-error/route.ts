import { NextResponse } from "next/server";

const MAX_STACK_BYTES = 8 * 1024;
const MAX_FIELD_BYTES = 2 * 1024;

function truncate(value: unknown, max: number): string {
  const str = typeof value === "string" ? value : String(value ?? "");
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…[truncated]`;
}

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { statusCode: 400, code: "INVALID_JSON", message: "Body must be JSON." },
      { status: 400 },
    );
  }

  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const safe = {
    message: truncate(record.message, MAX_FIELD_BYTES),
    source: truncate(record.source, MAX_FIELD_BYTES),
    lineno: typeof record.lineno === "number" ? record.lineno : undefined,
    colno: typeof record.colno === "number" ? record.colno : undefined,
    stack: truncate(record.stack, MAX_STACK_BYTES),
    requestId:
      typeof record.requestId === "string" ? record.requestId : undefined,
    url: truncate(record.url, MAX_FIELD_BYTES),
    userAgent: truncate(record.userAgent, MAX_FIELD_BYTES),
    occurredAt:
      typeof record.occurredAt === "string"
        ? record.occurredAt
        : new Date().toISOString(),
  };

  // In production this would forward to an aggregator (Sentry, Datadog, etc.).
  // For now we log structured JSON so it can be scraped from stdout.
  console.error("[telemetry] client_error", JSON.stringify(safe));

  return NextResponse.json({ ok: true });
}
