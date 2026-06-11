"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Graceful error boundary for the entire `(admin)` route group.
 *
 * The backend calls are already wrapped in `fetchBackend` (which returns a 503
 * instead of throwing), so this should rarely fire — but if any server
 * component throws (a transient network blip, an unexpected payload, a render
 * bug), this keeps the admin from white-screening and offers a one-click retry.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to the server log / observability without crashing.
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-ink-strong">
          تعذّر تحميل هذه الصفحة
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-muted">
          حدث خطأ غير متوقع أثناء الاتصال بالخادم. يمكنك إعادة المحاولة، وإذا
          استمرت المشكلة تواصل مع فريق التشغيل.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-soft">
            رمز الخطأ: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button variant="secondary" asChild>
            <a href="/dashboard">العودة للوحة التحكم</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
