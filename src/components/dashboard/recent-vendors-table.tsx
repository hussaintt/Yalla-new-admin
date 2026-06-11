"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/modals/action-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminVendorRow } from "@/lib/api/types";
import { formatDate, localizedText } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const gradients = [
  "bg-gradient-to-br from-brand-yellow-300 to-brand-orange",
  "bg-gradient-to-br from-brand-teal-600 to-primary",
  "bg-gradient-to-br from-brand-purple to-brand-pink",
  "bg-gradient-to-br from-brand-blue to-brand-cyan",
  "bg-gradient-to-br from-brand-rose to-brand-orange",
  "bg-gradient-to-br from-brand-green to-brand-teal-600",
];

function logoText(row: AdminVendorRow) {
  if (typeof row.legalName === "string" && row.legalName.length >= 2)
    return row.legalName.slice(0, 2).toUpperCase();
  return (row.slug ?? "YN").slice(0, 2).toUpperCase();
}

type SuspendTarget = { id: string; name: string } | null;

export function RecentVendorsTable() {
  const [status, setStatus] = useState<string>("ALL");
  const [suspend, setSuspend] = useState<SuspendTarget>(null);
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();

  const params: Record<string, string | undefined> = {
    limit: "6",
    sort: "createdAt:desc",
  };
  if (status !== "ALL") params.status = status;

  const vendors = useQuery({
    queryKey: queryKeys.vendors(params),
    queryFn: () => adminApi<{ data: AdminVendorRow[] }>(adminPaths.vendors(params)),
    select: (response) => response?.data ?? [],
  });

  async function handleExport() {
    setExporting(true);
    try {
      const url = adminPaths.reportsExport({
        type: "vendors",
        format: "csv",
        ...(status !== "ALL" ? { status } : {}),
      });
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error("تعذر تصدير الملف");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("تم تنزيل الملف");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التصدير");
    } finally {
      setExporting(false);
    }
  }

  const suspendMutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      adminApi<{ id: string; status: string }>(adminPaths.vendorSuspend(input.id), {
        method: "POST",
        body: { reason: input.reason, notifyVendor: true },
      }),
    onSuccess: () => {
      toast.success("تم إيقاف البائع");
      setSuspend(null);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <SectionCard
      title="آخر البائعين المسجلين"
      description="أحدث 6 بائعين انضموا للمنصة"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="ACTIVE">نشط</TabsTrigger>
              <TabsTrigger value="PENDING_REVIEW">قيد المراجعة</TabsTrigger>
              <TabsTrigger value="SUSPENDED">موقوف</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "جار التصدير..." : "تصدير CSV"}
          </Button>
        </div>
      }
    >
      {vendors.isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : vendors.isError ? (
        <ErrorState message={vendors.error.message} />
      ) : !vendors.data || vendors.data.length === 0 ? (
        <p className="text-sm text-ink-muted">لا يوجد بائعون.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>المتجر</TableHead>
              <TableHead>المالك</TableHead>
              <TableHead>التصنيف</TableHead>
              <TableHead>المنتجات</TableHead>
              <TableHead>الطلبات</TableHead>
              <TableHead>العمولة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الانضمام</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.data.map((row, index) => (
              <TableRow key={row.publicId ?? row.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      className={cn(
                        "size-8 text-[11px] text-white",
                        gradients[index % gradients.length],
                      )}
                    >
                      <AvatarFallback className="bg-transparent text-white">
                        {logoText(row)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{localizedText(row.displayName, row.slug ?? "—", "ar")}</div>
                      <div className="text-[10px] text-ink-muted">
                        {row.slug ?? "—"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{row.email ?? "—"}</TableCell>
                <TableCell>{row.storeType ?? "—"}</TableCell>
                <TableCell>{row._count?.products ?? "—"}</TableCell>
                <TableCell>{row._count?.members ?? "—"}</TableCell>
                <TableCell className="font-extrabold text-primary">
                  10%
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>{formatDate(row.createdAt)}</TableCell>
                <TableCell>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      row.status === "SUSPENDED"
                        ? toast.info("البائع موقوف بالفعل")
                        : setSuspend({ id: String(row.publicId ?? row.id), name: localizedText(row.displayName, row.slug ?? "—", "ar") })
                    }
                  >
                    إجراءات ▾
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ActionDialog
        open={Boolean(suspend)}
        title="إيقاف البائع"
        description={suspend ? `سيتم إيقاف البائع "${suspend.name}" وإخفاء متجره عن السوق. هذا إجراء حساس.` : ""}
        confirmLabel="تأكيد الإيقاف"
        variant="danger"
        requireReason
        reasonLabel="سبب الإيقاف"
        onCancel={() => setSuspend(null)}
        onConfirm={(reason) => {
          if (!suspend || !reason) return;
          suspendMutation.mutate({ id: suspend.id, reason });
        }}
      />
    </SectionCard>
  );
}
