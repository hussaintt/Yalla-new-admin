"use client";

import { Bell, X } from "lucide-react";
import { FormEvent, useState } from "react";

import { cn } from "@/lib/utils";

const PRESET_ACTIONS = [
  { value: "open_readiness_checklist", label: "فتح قائمة الجاهزية" },
  { value: "open_kyc", label: "فتح صفحة KYC" },
  { value: "open_payouts", label: "فتح المدفوعات" },
  { value: "open_vendor_dashboard", label: "فتح لوحة البائع" },
  { value: "custom", label: "إجراء مخصص" },
] as const;

type PresetAction = (typeof PRESET_ACTIONS)[number]["value"];

export function VendorNotifyDialog({
  open,
  vendorName,
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  vendorName?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { title: string; body: string; data: { action: string } }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [action, setAction] = useState<PresetAction>("open_readiness_checklist");
  const [customAction, setCustomAction] = useState("");

  if (!open) return null;

  const finalAction = action === "custom" ? customAction.trim() : action;
  const canSubmit =
    title.trim().length > 0 && body.trim().length > 0 && finalAction.length > 0;

  function reset() {
    setTitle("");
    setBody("");
    setAction("open_readiness_checklist");
    setCustomAction("");
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const payload = {
      title: title.trim(),
      body: body.trim(),
      data: { action: finalAction },
    };
    reset();
    onConfirm(payload);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={handleCancel}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-end shadow-2xl shadow-overlay"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-ink-strong">
                إرسال إشعار إلى البائع
              </h2>
              <p className="mt-1 text-sm leading-7 text-ink-muted">
                سيتم إرسال إشعار مباشر لكل أعضاء هذا البائع{vendorName ? ` (${vendorName})` : ""}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-ink-muted hover:bg-muted/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-ink-strong">
            العنوان
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={80}
              placeholder="مثال: تنبيه: تحديث وثيقة السجل التجاري"
              className="mt-2 h-11 w-full rounded-2xl border border-border bg-muted/40 px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="block text-sm font-bold text-ink-strong">
            النص
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={500}
              rows={4}
              placeholder="اكتب نص الإشعار الذي سيظهر للبائع"
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label className="block text-sm font-bold text-ink-strong">
            إجراء التطبيق
            <select
              value={action}
              onChange={(event) => setAction(event.target.value as PresetAction)}
              className="mt-2 h-11 w-full rounded-2xl border border-border bg-muted/40 px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            >
              {PRESET_ACTIONS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          {action === "custom" ? (
            <label className="block text-sm font-bold text-ink-strong">
              الإجراء المخصص
              <input
                value={customAction}
                onChange={(event) => setCustomAction(event.target.value)}
                required
                placeholder="open_custom_screen"
                className="mt-2 h-11 w-full rounded-2xl border border-border bg-muted/40 px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={disabled}
            className="h-11 rounded-2xl border border-border bg-card px-5 text-sm font-bold text-ink-strong hover:bg-muted disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={disabled || !canSubmit}
            className={cn(
              "h-11 rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            إرسال الإشعار
          </button>
        </div>
      </form>
    </div>
  );
}
