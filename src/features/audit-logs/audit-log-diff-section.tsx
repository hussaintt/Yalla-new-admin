"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { AuditLogDiff } from "@/lib/api/types";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type DiffMap = Record<string, unknown>;

function diffKeys(diff: { previous: DiffMap; updated: DiffMap }): {
  allKeys: string[];
  changedKeys: Set<string>;
  addedKeys: Set<string>;
  removedKeys: Set<string>;
} {
  const allKeys = Array.from(
    new Set([...Object.keys(diff.previous ?? {}), ...Object.keys(diff.updated ?? {})]),
  ).sort();
  const changedKeys = new Set<string>();
  const addedKeys = new Set<string>();
  const removedKeys = new Set<string>();
  const prev = diff.previous ?? {};
  const next = diff.updated ?? {};
  for (const key of allKeys) {
    if (!(key in prev)) {
      addedKeys.add(key);
      changedKeys.add(key);
      continue;
    }
    if (!(key in next)) {
      removedKeys.add(key);
      changedKeys.add(key);
      continue;
    }
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changedKeys.add(key);
    }
  }
  return { allKeys, changedKeys, addedKeys, removedKeys };
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-ink-muted">∅</span>;
  }
  if (typeof value === "object") {
    return (
      <pre dir="ltr" className="m-0 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink-strong">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="text-ink-strong">{String(value)}</span>;
}

export function AuditLogDiffSection({ auditLogId }: { auditLogId: string }) {
  const [hideEmpty, setHideEmpty] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.auditLogDiff(auditLogId),
    queryFn: () =>
      adminApi<AuditLogDiff>(adminPaths.auditLogDiff(auditLogId)),
    enabled: Boolean(auditLogId),
  });

  const summary = useMemo(() => {
    if (!query.data) return null;
    return diffKeys(query.data.diff ?? { previous: {}, updated: {} });
  }, [query.data]);

  const visibleKeys = useMemo(() => {
    if (!summary || !query.data) return [];
    const prev = query.data.diff.previous ?? {};
    const next = query.data.diff.updated ?? {};
    return summary.allKeys.filter((key) => {
      if (!hideEmpty) return true;
      const prevEmpty = prev[key] === null || prev[key] === undefined || prev[key] === "";
      const nextEmpty = next[key] === null || next[key] === undefined || next[key] === "";
      return !(prevEmpty && nextEmpty);
    });
  }, [summary, query.data, hideEmpty]);

  async function copyJson() {
    if (!query.data) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(query.data, null, 2),
      );
      toast.success("تم نسخ JSON");
    } catch {
      toast.error("تعذر نسخ JSON");
    }
  }

  return (
    <SectionCard
      title="التغييرات التفصيلية"
      description="مقارنة القيم قبل وبعد هذه العملية على الكائن المستهدف."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setHideEmpty((v) => !v)}
          >
            {hideEmpty ? "إظهار القيم الفارغة" : "إخفاء القيم الفارغة"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={copyJson}
            disabled={!query.data}
          >
            <Copy className="size-3.5" />
            نسخ JSON
          </Button>
        </div>
      }
    >
      {query.isLoading ? (
        <LoadingState label="جار تحميل الفروقات" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} />
      ) : !query.data || !summary ? (
        <p className="text-sm text-ink-muted">لا توجد فروقات مسجلة.</p>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-ink-muted">الإجراء</div>
              <div className="text-sm font-bold text-ink-strong">{query.data.action}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-ink-muted">المنفذ</div>
              <div className="text-sm font-bold text-ink-strong" dir="ltr">
                {query.data.actor?.email ?? query.data.actor?.id ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-ink-muted">التاريخ</div>
              <div className="text-sm font-bold text-ink-strong">
                {formatDate(query.data.createdAt)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border pb-2 text-[11px] font-bold text-ink-muted">
            <div>القيمة السابقة</div>
            <div>القيمة المحدّثة</div>
          </div>

          <ul className="divide-y divide-border">
            {visibleKeys.length === 0 ? (
              <li className="py-4 text-center text-sm text-ink-muted">
                لا توجد فروقات.
              </li>
            ) : null}
            {visibleKeys.map((key) => {
              const prevValue = query.data.diff.previous?.[key];
              const nextValue = query.data.diff.updated?.[key];
              const isChanged = summary.changedKeys.has(key);
              const isAdded = summary.addedKeys.has(key);
              const isRemoved = summary.removedKeys.has(key);
              return (
                <li
                  key={key}
                  className={cn(
                    "grid grid-cols-[1fr_1fr] gap-2 py-2.5",
                    isChanged && "bg-warning-soft/30",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg border border-border p-2 text-xs",
                      isRemoved
                        ? "bg-destructive-soft/40"
                        : isChanged
                          ? "bg-destructive-soft/20"
                          : "bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 text-[10px] font-bold text-ink-muted",
                        isRemoved && "text-destructive",
                      )}
                    >
                      {key}
                      {isRemoved ? " • محذوف" : ""}
                    </div>
                    <div className={cn(isChanged && !isRemoved && "line-through")}>
                      {renderValue(prevValue)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg border border-border p-2 text-xs",
                      isAdded
                        ? "bg-success-soft/40"
                        : isChanged
                          ? "bg-success-soft/20"
                          : "bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 text-[10px] font-bold text-ink-muted",
                        isAdded && "text-success",
                      )}
                    >
                      {key}
                      {isAdded ? " • جديد" : ""}
                    </div>
                    <div className={cn(isChanged && "font-bold")}>
                      {renderValue(nextValue)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
