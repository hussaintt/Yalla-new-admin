"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/state/async-states";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { adminApi } from "@/lib/api/admin-client";
import { ApiError } from "@/lib/api/errors";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDate, formatMoney, localizedText } from "@/lib/formatters";

import { PromotionEditorDrawer } from "./promotion-editor-drawer";
import { toPromotionApiBody, type PromotionFormValues } from "./schema";
import { isPromotionExpired, type Promotion, type PromotionPage } from "./types";

const promotionStatuses = [
  { label: "نشط", value: "ACTIVE" },
  { label: "مسودة", value: "DRAFT" },
  { label: "منتهي", value: "EXPIRED" },
  { label: "ملغي", value: "CANCELLED" },
];

function discountLabel(promotion: Promotion): string {
  if (promotion.discountType === "FREE_SHIPPING") return "شحن مجاني";
  if (promotion.discountType === "PERCENTAGE") {
    const percent = (promotion.valueBps ?? 0) / 100;
    const cap = promotion.maxDiscountCents
      ? ` بحد أقصى ${formatMoney(promotion.maxDiscountCents)}`
      : "";
    return `${percent}%${cap}`;
  }
  return formatMoney(promotion.valueCents ?? 0);
}

export function PromotionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  const queryParams = {
    status: searchParams.get("status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const promotions = useQuery({
    queryKey: queryKeys.promotions(queryParams),
    queryFn: () => adminApi<PromotionPage>(adminPaths.promotions(queryParams)),
  });

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["promotions"] });

  const upsertPromotion = useMutation({
    mutationFn: (values: PromotionFormValues) => {
      const isEdit = Boolean(selectedPromotion);
      return adminApi(
        isEdit
          ? adminPaths.promotionDetail(selectedPromotion!.publicId)
          : adminPaths.promotions(),
        {
          method: isEdit ? "PATCH" : "POST",
          body: toPromotionApiBody(values, isEdit ? "edit" : "create"),
        },
      );
    },
    onSuccess: async () => {
      toast.success(
        selectedPromotion ? "تم تحديث الكوبون بنجاح" : "تم إنشاء الكوبون بنجاح",
      );
      setDrawerOpen(false);
      setSelectedPromotion(null);
      await invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 409) {
        toast.error("يوجد كوبون آخر بنفس الكود — اختر كوداً مختلفاً");
        return;
      }
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الكوبون");
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({
      promotion,
      status,
    }: {
      promotion: Promotion;
      status: "ACTIVE" | "CANCELLED";
    }) =>
      adminApi(adminPaths.promotionDetail(promotion.publicId), {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "ACTIVE" ? "تم تفعيل الكوبون" : "تم إيقاف الكوبون",
      );
      await invalidate();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث حالة الكوبون",
      );
    },
  });

  const deletePromotion = useMutation({
    mutationFn: (promotion: Promotion) =>
      adminApi(adminPaths.promotionDetail(promotion.publicId), {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("تم حذف الكوبون");
      await invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 409) {
        toast.error(
          "لا يمكن حذف كوبون تم استخدامه بالفعل — قم بإيقافه بدلاً من ذلك",
        );
        return;
      }
      toast.error(error instanceof Error ? error.message : "تعذر حذف الكوبون");
    },
  });

  const handleDelete = async (promotion: Promotion) => {
    const result = await confirm({
      title: "حذف الكوبون",
      description: `سيتم حذف الكوبون ${promotion.code ?? ""} نهائياً. لا يمكن حذف الكوبونات المستخدمة من قبل.`,
      confirmLabel: "حذف",
      variant: "danger",
    });
    if (result.confirmed) deletePromotion.mutate(promotion);
  };

  const rows = promotions.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="كوبونات الخصم"
        description="إنشاء وإدارة كوبونات الخصم: نسبة مئوية بحد أقصى، مبلغ ثابت، أو شحن مجاني، مع التحكم في عدد مرات الاستخدام وفترة الصلاحية."
        actions={
          <Button
            type="button"
            onClick={() => {
              setSelectedPromotion(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="me-1 size-4" />
            إنشاء كوبون
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: searchInput.trim() });
          }}
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث بكود الكوبون"
            dir="ltr"
            className="h-11 w-48 rounded-2xl border border-border bg-card px-3 text-sm text-ink-strong shadow-sm outline-none placeholder:text-ink-muted focus:border-primary"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            بحث
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={searchParams.get("status") ?? ""}
            onChange={(event) => updateParams({ status: event.target.value })}
            className="h-11 rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-ink-strong shadow-sm outline-none"
          >
            <option value="">كل الحالات</option>
            {promotionStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              router.push(pathname);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
            إعادة ضبط
          </button>
        </div>
      </div>

      {promotions.isLoading ? (
        <TableSkeleton />
      ) : promotions.isError ? (
        <ErrorState message={promotions.error.message} />
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-16 text-sm text-ink-muted shadow-sm">
          لا توجد كوبونات مطابقة — أنشئ كوبوناً جديداً من الزر بالأعلى.
        </div>
      ) : (
        <>
          <CursorDataTable
            data={rows}
            getRowKey={(promotion) => promotion.publicId}
            columns={[
              {
                id: "coupon",
                header: "الكوبون",
                cell: (promotion) => (
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm font-bold text-ink-strong" dir="ltr">
                        {promotion.code ?? "—"}
                      </span>
                      {promotion.code ? (
                        <CopyButton value={promotion.code} />
                      ) : null}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {localizedText(promotion.name, "-", "ar")}
                    </div>
                  </div>
                ),
              },
              {
                id: "discount",
                header: "الخصم",
                cell: (promotion) => (
                  <span className="text-sm font-bold text-ink-strong">
                    {discountLabel(promotion)}
                  </span>
                ),
              },
              {
                id: "usage",
                header: "الاستخدام",
                cell: (promotion) => (
                  <div className="text-sm text-ink-strong">
                    <span dir="ltr">
                      {promotion.usageCount} /{" "}
                      {promotion.usageLimitTotal ?? "∞"}
                    </span>
                    {promotion.usageLimitPerUser ? (
                      <div className="text-xs text-ink-muted">
                        {promotion.usageLimitPerUser} لكل عميل
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "validity",
                header: "الصلاحية",
                cell: (promotion) => {
                  const expired = isPromotionExpired(promotion);
                  return (
                    <div className="text-sm text-ink-strong">
                      <div>من {formatDate(promotion.validFrom)}</div>
                      <div className={expired ? "text-destructive" : undefined}>
                        {promotion.validUntil
                          ? `حتى ${formatDate(promotion.validUntil)}`
                          : "بدون تاريخ انتهاء"}
                      </div>
                    </div>
                  );
                },
              },
              {
                id: "status",
                header: "الحالة",
                cell: (promotion) => (
                  <StatusBadge
                    status={
                      isPromotionExpired(promotion)
                        ? "EXPIRED"
                        : promotion.status
                    }
                  />
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (promotion) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedPromotion(promotion);
                        setDrawerOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      تعديل
                    </Button>
                    {promotion.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-danger"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({ promotion, status: "CANCELLED" })
                        }
                      >
                        <Pause className="size-3.5" />
                        إيقاف
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-success"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({ promotion, status: "ACTIVE" })
                        }
                      >
                        <Play className="size-3.5" />
                        تفعيل
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive-soft"
                      disabled={deletePromotion.isPending}
                      onClick={() => handleDelete(promotion)}
                    >
                      <Trash2 className="size-3.5" />
                      حذف
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <CursorPager
            nextCursor={promotions.data?.nextCursor ?? undefined}
            hasMore={promotions.data?.hasMore ?? false}
          />
        </>
      )}

      <PromotionEditorDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedPromotion(null);
        }}
        promotion={selectedPromotion}
        pending={upsertPromotion.isPending}
        onSubmit={(values) => upsertPromotion.mutate(values)}
      />

      {confirmDialog}
    </div>
  );
}
