"use client";

import { Download, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TableToolbar({
  statusOptions = [],
  exportHref,
}: {
  statusOptions?: Array<{ label: string; value: string }>;
  exportHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-end">
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
