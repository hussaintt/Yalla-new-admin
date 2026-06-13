"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/modals/action-dialog";
import { ApprovalCard } from "@/components/ui/approval-card";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { KycQueueRow } from "@/lib/api/types";
import { formatRelative, localizedText } from "@/lib/formatters";

type PendingAction =
  | { kind: "approve"; row: KycQueueRow }
  | { kind: "reject"; row: KycQueueRow }
  | null;

const gradientByIndex = [
  "bg-gradient-to-br from-brand-yellow-300 to-brand-orange",
  "bg-gradient-to-br from-brand-teal-600 to-primary",
  "bg-gradient-to-br from-brand-purple to-brand-pink",
  "bg-gradient-to-br from-brand-blue to-brand-cyan",
];

function gradientFor(row: KycQueueRow, index: number) {
  return row.vendorLogoGradient ?? gradientByIndex[index % gradientByIndex.length];
}

function logoTextFor(row: KycQueueRow) {
  if (row.vendorLogoText) return row.vendorLogoText;
  const words = (row.vendorName ?? "").trim().split(/\s+/);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function KycApprovalQueue({
  rows,
  isLoading,
  isError,
  errorMessage,
}: {
  rows: KycQueueRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  const [pending, setPending] = useState<PendingAction>(null);
  const queryClient = useQueryClient();

  const review = useMutation({
    mutationFn: (input: { id: string | number; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      adminApi<{ id: string | number; status: string }>(
        adminPaths.verificationsReview(String(input.id)),
        { method: "PATCH", body: { status: input.status, rejectionReason: input.reason } },
      ),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "APPROVED" ? "تمت الموافقة على البائع" : "تم رفض البائع");
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "kyc-queue"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activeAlertsCount });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.welcomeSummary(30) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <SectionCard
      title="بائعون في انتظار الموافقة"
      description={`${rows.length} طلب يحتاج مراجعة`}
      actions={
        <Button asChild variant="ghost" size="sm" className="bg-brand-teal-50 text-primary hover:bg-primary hover:text-primary-foreground">
          <a href="/verifications">عرض الكل ({rows.length})</a>
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : isError ? (
        <ErrorState message={errorMessage ?? "تعذر تحميل قائمة الانتظار"} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">لا يوجد بائعون بانتظار المراجعة.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <ApprovalCard
              key={String(row.id)}
              logo={logoTextFor(row)}
              logoClassName={gradientFor(row, index)}
              name={row.vendorName}
              meta={
                <>
                  {row.ownerName ? <span>👤 {row.ownerName}</span> : null}
                  {row.city ? <span>📍 {row.city}</span> : null}
                  {row.category ? <span>📦 {row.category}</span> : null}
                  {row.submittedAtRelative ? <span>📅 {row.submittedAtRelative}</span> : null}
                </>
              }
              onView={() => row.href && (window.location.href = row.href)}
              onApprove={() => setPending({ kind: "approve", row })}
              onReject={() => setPending({ kind: "reject", row })}
            />
          ))}
        </div>
      )}

      <ActionDialog
        open={pending?.kind === "approve"}
        title="تأكيد الموافقة"
        description={`هل تريد الموافقة على بائع "${pending?.row.vendorName ?? ""}"؟ سيتم تفعيل متجره وإشعاره.`}
        confirmLabel="تأكيد الموافقة"
        variant="success"
        onCancel={() => setPending(null)}
        onConfirm={() => pending && review.mutate({ id: pending.row.publicId || pending.row.id, status: "APPROVED" })}
      />

      <ActionDialog
        open={pending?.kind === "reject"}
        title="رفض طلب البائع"
        description={`سيتم رفض بائع "${pending?.row.vendorName ?? ""}" وإشعاره بسبب الرفض.`}
        confirmLabel="تأكيد الرفض"
        variant="danger"
        requireReason
        reasonLabel="سبب الرفض"
        reasonPlaceholder="مثال: وثائق غير واضحة / نشاط لا يتوافق مع سياسات المنصة"
        onCancel={() => setPending(null)}
        onConfirm={(reason) =>
          pending && review.mutate({ id: pending.row.publicId || pending.row.id, status: "REJECTED", reason })
        }
      />
    </SectionCard>
  );
}

interface ApiVerificationItem {
  id: number;
  publicId: string;
  type: "vendor" | "user";
  documentType: string;
  createdAt: string;
  status: string;
  vendor?: {
    displayName: unknown;
    slug: string;
  } | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export function useKycQueue(limit = 4, live = false) {
  return useQuery({
    queryKey: queryKeys.dashboard.kycQueue(limit),
    queryFn: () => adminApi<{ data: ApiVerificationItem[] }>(adminPaths.verificationsQueue(limit)),
    select: (response) => {
      const items = response?.data ?? [];
      return items.map((item: ApiVerificationItem): KycQueueRow => {
        const isVendor = item.type === "vendor";
        const displayName = isVendor && item.vendor
          ? localizedText(item.vendor.displayName, item.vendor.slug, "ar")
          : item.user
            ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || item.user.email
            : "مستخدم غير معروف";

        return {
          id: item.id,
          publicId: item.publicId,
          vendorName: displayName,
          ownerName: isVendor && item.user
            ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || item.user.email
            : isVendor
              ? undefined
              : "حساب مستخدم",
          category: item.documentType || "وثيقة تحقق",
          submittedAt: item.createdAt,
          submittedAtRelative: formatRelative(item.createdAt),
          status: item.status,
          href: "/verifications",
        };
      });
    },
    refetchInterval: live ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}
