import { NextResponse } from "next/server";

export function getBackendBaseUrl() {
  const baseUrl = process.env.YALLA_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("YALLA_API_BASE_URL is not configured.");
  }

  return baseUrl.replace(/\/$/, "");
}

const DEFAULT_BACKEND_TIMEOUT_MS = 15_000;

export type BackendFetchSuccess = {
  ok: true;
  response: Response;
};

export type BackendFetchFailure =
  | {
      ok: false;
      reason: "unreachable";
      error: unknown;
    }
  | {
      ok: false;
      reason: "timeout";
      error: unknown;
    };

export type BackendFetchResult = BackendFetchSuccess | BackendFetchFailure;

/**
 * Fetch the backend with a hard timeout and a try/catch around `fetch` itself.
 * Node's `fetch` throws a `TypeError: fetch failed` for DNS, TLS, ECONNRESET,
 * etc. — that error is fatal in a server component or route handler, so we
 * trap it here and return a discriminated result callers can convert into a
 * normal "unauthenticated" / "service unavailable" response.
 */
export async function fetchBackend(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<BackendFetchResult> {
  const { timeoutMs = DEFAULT_BACKEND_TIMEOUT_MS, signal, ...rest } = init;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const composedSignal = combineSignals([signal, timeoutController.signal]);

  try {
    const response = await fetch(input, { ...rest, signal: composedSignal });
    return { ok: true, response };
  } catch (error) {
    if (timeoutController.signal.aborted) {
      return { ok: false, reason: "timeout", error };
    }
    return { ok: false, reason: "unreachable", error };
  } finally {
    clearTimeout(timer);
  }
}

function combineSignals(signals: Array<AbortSignal | null | undefined>) {
  const live = signals.filter((s): s is AbortSignal => Boolean(s));
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of live) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export async function parseBackendResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function isStreamableResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const contentDisposition =
    response.headers.get("content-disposition")?.toLowerCase() ?? "";

  if (contentDisposition.includes("attachment")) return true;
  if (contentType.startsWith("image/")) return true;
  if (contentType.startsWith("video/")) return true;
  if (contentType.startsWith("audio/")) return true;
  if (contentType === "application/pdf") return true;
  if (contentType === "application/octet-stream") return true;
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return true;
  if (contentType.includes("zip")) return true;

  return false;
}

function copyHeader(
  source: Headers,
  target: Headers,
  name: string,
  fallback?: string,
) {
  const value = source.get(name) ?? fallback;
  if (value) target.set(name, value);
}

export function streamBackendResponse(response: Response) {
  const headers = new Headers();

  copyHeader(response.headers, headers, "content-type", "application/octet-stream");
  copyHeader(response.headers, headers, "content-length");
  copyHeader(response.headers, headers, "content-disposition");
  copyHeader(response.headers, headers, "etag");
  copyHeader(response.headers, headers, "last-modified");
  copyHeader(response.headers, headers, "cache-control", "private, no-store");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
