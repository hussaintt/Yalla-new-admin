"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { EmptyState, ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

import { VendorBillingControlDialog } from "./billing-actions";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

const FILTERS = [
  { label: "الموقوفة", value: "true" },
  { label: "النشطة", value: "false" },
  { label: "الكل", value: "" },
];

export function BillingAccountsPage() {
  const searchParams = useSearchParams();
  const restricted = searchParams.get("restricted") ?? "";
  const params = {
    restricted: restricted || undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const [managed, setManaged] = useState<AnyRecord | null>(null);

  const accounts = useQuery({
    queryKey: ["billing", "accounts", params],
    queryFn: () =>
      adminApi<AnyRecord>(
        withQuery("/api/admin/admin/vendor-billing/accounts", params),
      ),
  });

  const data: AnyRecord[] = (() => {
    const raw = accounts.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)) {
      return (raw as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();
  const page = accounts.data as AnyRecord | undefined;

  const managedVendor = managed?.vendor as AnyRecord | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="عمولات البائعين والمتاجر الموقوفة"
        description="المتاجر التي عليها عمولات مستحقة تُوقَف تلقائياً وتختفي من التطبيق. من هنا يمكنك تسجيل سداد تم نقداً أو بالتواصل المباشر، أو إعادة تفعيل متجر موقوف."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/billing/vendors?restricted=${filter.value}` : "/billing/vendors"}
            className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold transition ${
              restricted === filter.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-ink-muted hover:bg-muted hover:text-ink-strong"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {accounts.isLoading ? (
        <TableSkeleton />
      ) : accounts.isError ? (
        <ErrorState message={accounts.error.message} />
      ) : data.length === 0 ? (
        <EmptyState
          title={restricted === "true" ? "لا توجد متاجر موقوفة" : "لا توجد حسابات فوترة"}
          description={
            restricted === "true"
              ? "جميع المتاجر نشطة ولا توجد عمولات متأخرة موجبة للإيقاف."
              : "لم يتم تسجيل حسابات فوترة حتى الآن."
          }
        />
      ) : (
        <>
          <CursorDataTable
            data={data}
            getRowKey={(row) => String(row.publicId ?? row.id ?? row.vendorId)}
            columns={[
              {
                id: "vendor",
                header: "البائع",
                cell: (row) => {
                  const vendor = row.vendor as AnyRecord | undefined;
                  const vendorId = String(vendor?.publicId ?? row.vendorPublicId ?? "");
                  return (
                    <div>
                      <Link
                        href={`/vendors/${vendorId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {text(vendor?.displayName ?? vendorId)}
                      </Link>
                      {vendor?.legalName ? (
                        <div className="text-xs text-ink-muted">{String(vendor.legalName)}</div>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                id: "due",
                header: "العمولة المستحقة",
                cell: (row) => {
                  const due = Number(row.dueBalanceCents ?? 0);
                  const count = Number(row.openInvoiceCount ?? 0);
                  if (due <= 0) return <span className="text-ink-muted">لا شيء</span>;
                  return (
                    <div>
                      <div className="font-bold text-destructive">
                        {formatMoney(due, String(row.currency ?? "EGP"))}
                      </div>
                      <div className="text-xs text-ink-muted">{count} فاتورة مفتوحة</div>
                    </div>
                  );
                },
              },
              {
                id: "grace",
                header: "مهلة السداد",
                cell: (row) =>
                  row.oldestGraceEndsAt ? formatDate(row.oldestGraceEndsAt) : "-",
              },
              {
                id: "prepaid",
                header: "رصيد مدفوع مقدماً",
                cell: (row) => formatMoney(row.prepaidBalanceCents ?? 0, String(row.currency ?? "EGP")),
              },
              {
                id: "status",
                header: "حالة المتجر",
                cell: (row) =>
                  row.restrictedAt ? (
                    <div>
                      <StatusBadge status="RESTRICTED" />
                      <div className="mt-1 text-xs text-ink-muted">
                        موقوف منذ {formatDate(row.restrictedAt)}
                      </div>
                    </div>
                  ) : (
                    <StatusBadge status="ACTIVE" />
                  ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (row) => {
                  const due = Number(row.dueBalanceCents ?? 0);
                  if (!row.restrictedAt && due <= 0) return null;
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant={row.restrictedAt ? "primary" : "secondary"}
                      onClick={() => setManaged(row)}
                    >
                      {row.restrictedAt ? "إعادة تفعيل / تسوية" : "تسوية العمولة"}
                    </Button>
                  );
                },
              },
            ]}
          />
          <CursorPager
            nextCursor={page?.nextCursor as string | undefined}
            hasMore={page?.hasMore as boolean | undefined}
          />
        </>
      )}

      {managed ? (
        <VendorBillingControlDialog
          vendorId={String(managedVendor?.publicId ?? "")}
          vendorName={String(managedVendor?.displayName ?? "")}
          currency={String(managed.currency ?? "EGP")}
          restricted={Boolean(managed.restrictedAt)}
          open={managed !== null}
          onOpenChange={(open) => {
            if (!open) setManaged(null);
          }}
        />
      ) : null}
    </div>
  );
}
