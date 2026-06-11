"use client";

import { Download, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function TableToolbar({
  searchPlaceholder = "بحث",
  statusOptions = [],
  showSearch = true,
  exportHref,
}: {
  searchPlaceholder?: string;
  statusOptions?: Array<{ label: string; value: string }>;
  showSearch?: boolean;
  exportHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("cursor");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ q: q.trim() });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between">
      {showSearch ? (
        <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-sm md:max-w-md">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border-0 bg-transparent text-sm text-ink-strong outline-none placeholder:text-ink-muted"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            بحث
          </button>
        </form>
      ) : (
        <div />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.length > 0 ? (
          <select
            value={status}
            onChange={(event) => updateParams({ status: event.target.value })}
            className="h-11 rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-ink-strong outline-none shadow-sm"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {exportHref ? (
          <a
            href={exportHref}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            تصدير
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
          إعادة ضبط
        </button>
      </div>
    </div>
  );
}
