import * as React from "react";

import { cn } from "@/lib/utils";

export type AnchorSection = {
  id: string;
  label: string;
  icon?: React.ElementType;
};

export function SectionAnchorNav({
  sections,
  activeId,
  className,
}: {
  sections: AnchorSection[];
  activeId?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="أقسام لوحة التحكم"
      className={cn(
        "sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/85 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border scrollbar-thin",
        className,
      )}
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeId === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-ink-muted hover:border-primary/40 hover:text-primary",
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
