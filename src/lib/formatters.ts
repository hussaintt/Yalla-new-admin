export function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelative(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("ar-EG", { numeric: "auto" });
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return formatter.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 86400 * 365) return formatter.format(Math.round(diffSeconds / (86400 * 30)), "month");
  return formatter.format(Math.round(diffSeconds / (86400 * 365)), "year");
}

export function formatMoney(cents: unknown, currency = "EGP") {
  const amount =
    typeof cents === "number"
      ? cents / 100
      : typeof cents === "string"
        ? Number(cents) / 100
        : 0;

  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatName(entity: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  fullName?: string | null;
  email?: string | null;
}) {
  const combined = [entity.firstName, entity.lastName].filter(Boolean).join(" ");
  return entity.fullName ?? entity.name ?? (combined || entity.email) ?? "-";
}

export function localizedText(
  value: unknown,
  fallback = "-",
  preferredLocale: "en" | "ar" = "en",
) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = record[preferredLocale];
    const alternate = preferredLocale === "en" ? record.ar : record.en;
    if (typeof preferred === "string") return preferred;
    if (typeof alternate === "string") return alternate;
  }
  return fallback;
}

export function roleLabel(role: unknown) {
  if (typeof role === "string") return role;
  if (!role || typeof role !== "object") return "";
  const record = role as Record<string, unknown>;
  const nestedRole = record.role;
  if (nestedRole && typeof nestedRole === "object") {
    const nested = nestedRole as Record<string, unknown>;
    return String(nested.name ?? nested.code ?? nested.slug ?? "");
  }
  return String(record.name ?? record.code ?? record.slug ?? "");
}
