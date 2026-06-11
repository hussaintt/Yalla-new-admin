"use client";

import { Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { adminPaths } from "@/lib/api/paths";

const reportTypes = [
  { value: "vendors", label: "البائعون" },
  { value: "orders", label: "الطلبات" },
  { value: "payments", label: "المدفوعات" },
  { value: "refunds", label: "الاستردادات" },
  { value: "audit-logs", label: "سجل النشاط" },
];

const formats = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
];

export function ReportsPage() {
  const [type, setType] = useState("vendors");
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportUrl = useMemo(
    () =>
      adminPaths.reportsExport({
        type,
        format,
        from: from || undefined,
        to: to || undefined,
      }),
    [format, from, to, type],
  );

  async function handleExport() {
    setError("");
    setExporting(true);

    try {
      const response = await fetch(exportUrl, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error("تعذر تصدير التقرير من الباك إند");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("تم تنزيل التقرير");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تصدير التقرير";
      setError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        description="تصدير تقارير تشغيلية من خلال مسار BFF الآمن دون الاتصال المباشر بالباك إند."
      />

      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <SectionCard
          title="إنشاء تقرير"
          description="اختر نوع التقرير والصيغة ونطاق التاريخ ثم نزّل الملف."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold text-ink-strong">
              نوع التقرير
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {reportTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-bold text-ink-strong">
              الصيغة
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {formats.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-bold text-ink-strong">
              من تاريخ
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="space-y-1.5 text-sm font-bold text-ink-strong">
              إلى تاريخ
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end border-t border-border pt-4">
            <Button type="button" onClick={handleExport} disabled={exporting}>
              <Download />
              {exporting ? "جار التصدير" : "تنزيل التقرير"}
            </Button>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="مسار آمن" description="كل التنزيلات تمر عبر /api/admin">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
                <ShieldCheck className="size-5" />
              </div>
              <p className="text-sm leading-7 text-ink-muted">
                يتم إرسال ملفات التقارير عبر BFF بنفس كوكي الجلسة الحالية، لذلك لا تظهر
                رموز الوصول في المتصفح ولا يحدث اتصال مباشر مع خدمة الباك إند.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="الصيغ المتاحة" description="مناسبة للتحليل أو الأرشفة">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-green-50 text-brand-green">
                <FileSpreadsheet className="size-5" />
              </div>
              <p className="text-sm leading-7 text-ink-muted">
                استخدم CSV للتصدير السريع، وXLSX عند الحاجة لتسليم الملف لفريق العمليات
                أو المحاسبة بنفس بنية الجداول.
              </p>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
