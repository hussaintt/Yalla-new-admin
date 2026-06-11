import { Suspense } from "react";

import { AlertItem } from "@/components/ui/alert-item";
import { SectionCard } from "@/components/ui/section-card";
import { LoadingState } from "@/components/state/async-states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

function NotificationsPlaceholder() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإشعارات"
        description="إرسال إعلانات جماعية لجميع البائعين أو العملاء."
      />

      <AlertItem
        severity="info"
        className="rounded-2xl p-5"
        title="هذه الصفحة قيد الانتظار من الباك إند"
        description="POST /v1/admin/notifications/broadcast يوقّع الرسالة في قائمة الانتظار. الواجهة جاهزة (frontend done ✅) لكن endpoint الباك إند غير متاح حتى الآن (P1 في bk-gaps.md)."
      />

      <SectionCard
        title="إرسال إشعار جماعي"
        description="اختر قناة الإرسال والجمهور المستهدف، ثم اكتب العنوان والنص."
      >
        <form className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-ink-strong">
                قناة الإرسال
              </label>
              <select
                disabled
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none disabled:opacity-50"
              >
                <option value="PUSH">إشعار تطبيق (PUSH)</option>
                <option value="EMAIL">بريد إلكتروني</option>
                <option value="SMS">رسالة قصيرة</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-ink-strong">
                الجمهور
              </label>
              <select
                disabled
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none disabled:opacity-50"
              >
                <option value="ALL_VENDORS">كل البائعين</option>
                <option value="ALL_CUSTOMERS">كل العملاء</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-ink-strong">
              العنوان
            </label>
            <input
              type="text"
              disabled
              maxLength={80}
              placeholder="مثال: تحديث مهم لشروط البائع"
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-ink-strong">
              النص
            </label>
            <textarea
              disabled
              rows={4}
              maxLength={500}
              placeholder="اكتب نص الرسالة هنا"
              className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink-strong outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" disabled>
              إرسال
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

export default async function NotificationsRoute() {
  await requirePagePermission("marketing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الإشعارات" />}>
      <NotificationsPlaceholder />
    </Suspense>
  );
}
