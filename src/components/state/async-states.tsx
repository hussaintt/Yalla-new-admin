import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "جار التحميل" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm font-semibold text-ink-muted shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {label}...
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-ink-muted">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="mt-4 text-sm font-bold text-ink-strong">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink-muted">
        {description}
      </p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive-soft p-5 text-sm font-semibold text-destructive shadow-sm">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
