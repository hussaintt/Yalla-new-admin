"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CursorPager({
  nextCursor,
  hasMore,
}: {
  nextCursor?: string | null;
  hasMore?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCursor(cursor?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (cursor) params.set("cursor", cursor);
    else params.delete("cursor");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setCursor(null)}
        disabled={!searchParams.get("cursor")}
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-0" />
        الأولى
      </button>
      <button
        type="button"
        onClick={() => setCursor(nextCursor)}
        disabled={!hasMore || !nextCursor}
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        التالي
        <ChevronRight className="h-4 w-4 rtl:rotate-0" />
      </button>
    </div>
  );
}
