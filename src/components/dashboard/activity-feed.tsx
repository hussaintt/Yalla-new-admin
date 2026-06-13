"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import * as React from "react";

import { ErrorState, LoadingState } from "@/components/state/async-states";
import {
  ActivityItem,
  ActivityTimeline,
  type ActivityTone,
} from "@/components/ui/activity-item";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Radio } from "lucide-react";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { ActivityItem as ActivityItemData } from "@/lib/api/types";
import { formatMoney } from "@/lib/formatters";

function formatRelative(iso: string) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.round(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function renderText(item: ActivityItemData) {
  if (item.amountCents != null && item.currency) {
    const amount = formatMoney(item.amountCents, item.currency);
    return (
      <>
        {item.text.split(item.subjectLabel ?? "").map((part, index, arr) => (
          <React.Fragment key={index}>
            {part}
            {index < arr.length - 1 ? (
              <strong className="font-bold text-ink">{item.subjectLabel}</strong>
            ) : null}
          </React.Fragment>
        ))}{" "}
        <strong className="font-extrabold text-primary">{amount}</strong>
      </>
    );
  }
  return <>{item.text}</>;
}

export function ActivityFeed({
  items,
  isLoading,
  isError,
  errorMessage,
  onLiveToggle,
  live,
}: {
  items: ActivityItemData[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onLiveToggle?: (value: boolean) => void;
  live?: boolean;
}) {
  return (
    <SectionCard
      title="سجل النشاط المباشر"
      description="آخر أحداث المنصة"
      actions={
        onLiveToggle ? (
          <Button
            type="button"
            variant={live ? "primary" : "secondary"}
            size="sm"
            onClick={() => onLiveToggle(!live)}
            aria-pressed={live ?? false}
            aria-label={
              live
                ? "إيقاف التحديث التلقائي"
                : "تشغيل التحديث التلقائي"
            }
          >
            <Radio className="size-3.5" />
            {live ? "مباشر" : "متوقف"}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : isError ? (
        <ErrorState message={errorMessage ?? "تعذر تحميل السجل"} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">لا توجد أحداث بعد.</p>
      ) : (
        <ActivityTimeline>
          {items.map((item) => (
            <ActivityItem
              key={item.id}
              tone={(item.tone ?? "neutral") as ActivityTone}
              text={renderText(item)}
              time={
                <span className="flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {formatRelative(item.createdAt)}
                </span>
              }
            />
          ))}
        </ActivityTimeline>
      )}
    </SectionCard>
  );
}

export function useActivityFeed(limit = 6, live = false) {
  return useQuery({
    queryKey: queryKeys.dashboard.activityFeed(limit),
    queryFn: () => adminApi<{ data: ActivityItemData[] }>(adminPaths.opsActivityFeed(limit)),
    select: (response) => response?.data ?? [],
    refetchInterval: live ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
}
