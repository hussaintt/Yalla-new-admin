import { ApiError, normalizeApiError } from "@/lib/api/errors";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retryOnUnauthorized?: boolean;
  requestId?: string;
};

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isFormBody(body: unknown): body is FormData | Blob | ArrayBuffer {
  return (
    typeof FormData !== "undefined" && body instanceof FormData
  ) || (
    typeof Blob !== "undefined" && body instanceof Blob
  ) || body instanceof ArrayBuffer;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildHeaders(options: RequestOptions, hasRawBody: boolean, requestId: string) {
  const headers = new Headers(options.headers);

  if (!hasRawBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", requestId);
  }

  return headers;
}

function buildBody(body: unknown) {
  if (body === undefined) return undefined;
  if (isFormBody(body)) return body;
  return JSON.stringify(body);
}

async function rawAdminFetch(path: string, options: RequestOptions, requestId: string) {
  const hasRawBody = isFormBody(options.body);

  return fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: buildHeaders(options, hasRawBody, requestId),
    body: buildBody(options.body),
  });
}

async function tryRefreshSession(): Promise<boolean> {
  try {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    return refreshResponse.ok;
  } catch {
    return false;
  }
}

export async function clearAdminSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // best-effort: cookies may already be gone
  }
}

export function getCsrfError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "CSRF_ORIGIN_BLOCKED";
}

export function getRequestId(error: unknown): string | undefined {
  if (error instanceof ApiError && error.details && typeof error.details === "object") {
    const details = error.details as Record<string, unknown>;
    if (typeof details.requestId === "string") return details.requestId;
  }
  return undefined;
}

export async function adminApi<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const shouldRetry = options.retryOnUnauthorized ?? true;
  const requestId = options.requestId ?? generateRequestId();
  let response = await rawAdminFetch(path, options, requestId);

  if (response.status === 401 && shouldRetry) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await rawAdminFetch(path, { ...options, retryOnUnauthorized: false }, requestId);
    } else {
      // terminal 401: clear cookies so the next visit forces a fresh login
      await clearAdminSession();
    }
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(normalizeApiError(payload, response.status));
  }

  return payload as T;
}
