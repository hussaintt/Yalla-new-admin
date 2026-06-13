"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type { VendorPage } from "@/lib/api/types";
import { localizedText } from "@/lib/formatters";

type Channel = "RETAIL" | "BULK" | "BOTH";

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "BOTH", label: "تجزئة وجملة" },
  { value: "RETAIL", label: "تجزئة فقط" },
  { value: "BULK", label: "جملة فقط" },
];

export function CommissionBulkApplyDialog({
  open,
  onOpenChange,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}) {
  const [rateBps, setRateBps] = useState("105");
  const [applyToAll, setApplyToAll] = useState(false);
  const [channel, setChannel] = useState<Channel>("BOTH");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // State resets between opens by remounting (parent passes a fresh `key`),
  // so no reset-on-open effect is needed.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const vendors = useQuery({
    queryKey: ["commission-bulk-vendors", debouncedSearch],
    queryFn: () =>
      adminApi<VendorPage>(
        adminPaths.vendors({ q: debouncedSearch || undefined, limit: "50" }),
      ),
    enabled: open && !applyToAll,
  });

  const rows = vendors.data?.data ?? [];

  const toggleVendor = (publicId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const parsedBps = Number(rateBps);
  const bpsValid = Number.isInteger(parsedBps) && parsedBps >= 0 && parsedBps <= 10000;
  const canSubmit = bpsValid && (applyToAll || selected.size > 0);

  const ratePctLabel = useMemo(
    () => (bpsValid ? `${(parsedBps / 100).toFixed(2)}%` : "—"),
    [bpsValid, parsedBps],
  );

  const apply = useMutation({
    mutationFn: () =>
      adminApi(adminPaths.commissionsRatesBulk(), {
        method: "POST",
        body: {
          rateBps: parsedBps,
          applyToAll,
          vendorIds: applyToAll ? undefined : Array.from(selected),
          categoryId: applyToAll ? undefined : categoryId.trim() || null,
          channel: applyToAll ? channel : undefined,
          isActive,
        },
      }),
    onSuccess: (result: unknown) => {
      const r = (result ?? {}) as {
        mode?: string;
        created?: number;
        updated?: number;
        vendorCount?: number;
      };
      if (r.mode === "platform_default") {
        toast.success(`تم تحديث النسبة الافتراضية العامة إلى ${ratePctLabel}`);
      } else {
        toast.success(
          `تم تطبيق العمولة على ${r.vendorCount ?? selected.size} بائع (${r.created ?? 0} جديدة، ${r.updated ?? 0} محدّثة)`,
        );
      }
      onApplied();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تطبيق العمولة");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>تطبيق عمولة على عدة بائعين</DialogTitle>
          <DialogDescription>
            حدد النسبة ثم اختر البائعين، أو فعّل &quot;كل البائعين&quot; لضبط النسبة الافتراضية العامة للمنصة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-rate">نسبة العمولة بالنقاط (100 bps = 1%)</Label>
            <div className="flex items-center gap-2">
              <input
                id="bulk-rate"
                type="number"
                min={0}
                max={10000}
                value={rateBps}
                onChange={(e) => setRateBps(e.target.value)}
                className={inputClass}
              />
              <span className="shrink-0 text-sm font-bold text-primary">{ratePctLabel}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-ink-strong">تطبيق على كل البائعين</p>
              <p className="text-xs text-ink-muted">
                يحدّث النسبة الافتراضية العامة — يسري على كل بائع حالي ومستقبلي بلا قاعدة خاصة.
              </p>
            </div>
            <Switch checked={applyToAll} onCheckedChange={setApplyToAll} />
          </div>

          {applyToAll ? (
            <div className="space-y-1.5">
              <Label>القناة</Label>
              <div className="flex gap-2">
                {CHANNELS.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant={channel === c.value ? "primary" : "secondary"}
                    onClick={() => setChannel(c.value)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-category">معرف التصنيف (اختياري)</Label>
                <input
                  id="bulk-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder="اتركه فارغاً لتطبيق النسبة على كل تصنيفات البائع"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>البائعون المستهدفون</Label>
                  <span className="text-xs text-ink-muted">{selected.size} محدد</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="ابحث عن بائع بالاسم..."
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList>
                      {vendors.isLoading ? (
                        <div className="py-6 text-center text-sm text-ink-muted">جار التحميل...</div>
                      ) : rows.length === 0 ? (
                        <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      ) : (
                        rows.map((vendor) => {
                          const isChecked = selected.has(vendor.publicId);
                          return (
                            <CommandItem
                              key={vendor.publicId}
                              value={vendor.publicId}
                              onSelect={() => toggleVendor(vendor.publicId)}
                            >
                              <span
                                className={`grid size-4 place-items-center rounded border ${
                                  isChecked ? "border-primary bg-primary text-white" : "border-border"
                                }`}
                              >
                                {isChecked ? <Check className="size-3" /> : null}
                              </span>
                              <span className="flex-1 truncate">
                                {localizedText(vendor.displayName, vendor.legalName ?? vendor.publicId, "ar")}
                              </span>
                              <span className="text-xs text-ink-muted">{vendor.status}</span>
                            </CommandItem>
                          );
                        })
                      )}
                    </CommandList>
                  </Command>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-sm font-bold text-ink-strong">القاعدة نشطة</p>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || apply.isPending}
            onClick={() => apply.mutate()}
          >
            {apply.isPending ? "جارٍ التطبيق..." : "تطبيق"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
