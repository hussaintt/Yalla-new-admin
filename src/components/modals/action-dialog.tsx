"use client";

import { AlertTriangle } from "lucide-react";
import { FormEvent, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  variant = "default",
  requireReason = false,
  reasonLabel = "السبب",
  reasonPlaceholder = "اكتب السبب لظهوره في سجل التدقيق",
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "danger" | "success";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");

  const confirmClassName =
    variant === "danger"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20"
      : variant === "success"
        ? "bg-success text-success-foreground hover:bg-success/90 shadow-success/20"
        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20";

  const iconClassName =
    variant === "danger"
      ? "bg-destructive-soft text-destructive"
      : variant === "success"
        ? "bg-success-soft text-success"
        : "bg-warning-soft text-warning";

  function handleCancel() {
    setReason("");
    onCancel();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (requireReason && !trimmedReason) return;
    setReason("");
    onConfirm(trimmedReason || undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
    >
      <DialogContent dir="rtl" className="max-w-lg gap-0 p-6 text-end">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 text-right">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  iconClassName,
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-extrabold text-ink-strong">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-7 text-ink-muted">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {requireReason ? (
            <label className="block text-sm font-bold text-ink-strong">
              {reasonLabel}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                required
                placeholder={reasonPlaceholder}
                maxLength={500}
                className="mt-2 w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
              />
            </label>
          ) : null}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={disabled}
            >
              إلغاء
            </Button>
            <button
              type="submit"
              disabled={disabled || (requireReason && !reason.trim())}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-2xl px-5 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
                confirmClassName,
              )}
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
