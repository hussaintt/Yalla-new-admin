export type ApiErrorPayload = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export function normalizeApiError(payload: unknown, statusCode: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return {
      statusCode,
      code:
        typeof record.code === "string"
          ? record.code
          : statusCode >= 500
            ? "SERVER_ERROR"
            : "REQUEST_ERROR",
      message:
        typeof record.message === "string"
          ? record.message
          : "Something went wrong.",
      details: record.details,
    } satisfies ApiErrorPayload;
  }

  return {
    statusCode,
    code: statusCode >= 500 ? "SERVER_ERROR" : "REQUEST_ERROR",
    message: "Something went wrong.",
  } satisfies ApiErrorPayload;
}
