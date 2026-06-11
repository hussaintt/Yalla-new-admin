import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted",
        className,
      )}
    >
      <ArrowRight className="h-4 w-4" />
      {children ?? "رجوع"}
    </Link>
  );
}
