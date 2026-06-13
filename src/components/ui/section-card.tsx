import * as React from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
  id?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-32 rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-[15px] font-extrabold text-ink-strong">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={cn(hasHeader ? "px-5 pb-5 pt-4" : "p-5", contentClassName)}>
        {children ?? null}
      </div>
    </section>
  );
}
