// Slug helpers for catalog create forms (brands, categories, store categories).
// The backend enforces `^[a-z0-9-]+$` on slugs, so the UI must always produce a
// URL-safe value regardless of what the admin types (spaces, capitals, Arabic).

export const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** Lowercase, strip diacritics, collapse non [a-z0-9] runs to "-", trim hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Always returns a valid slug of at least 2 chars (the backend's `minLength`).
 * Handles Arabic-only or single-char names (where `slugify` yields ""/too short)
 * by falling back to a short random suffix, so the create call never 400s.
 */
export function toSlugOrFallback(primary: string, fallbackSeed = ""): string {
  for (const candidate of [slugify(primary), slugify(fallbackSeed)]) {
    if (candidate.length >= 2) return candidate;
  }
  return `item-${Math.random().toString(36).slice(2, 8)}`;
}
