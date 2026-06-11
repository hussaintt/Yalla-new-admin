import * as React from "react";

import { cn } from "@/lib/utils";

export function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre
      dir="ltr"
      className={cn(
        "overflow-auto rounded-xl bg-ink-strong p-3 text-xs leading-6 text-primary-foreground",
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  );
}
