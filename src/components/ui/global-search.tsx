"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

export type GlobalSearchResult = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href?: string;
  onSelect?: () => void;
};

export function GlobalSearchTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-secondary px-3 text-start text-sm text-ink-muted transition hover:bg-white",
        className,
      )}
    >
      <Search className="size-4 text-ink-muted" />
      <span className="flex-1 truncate">ابحث عن بائع، طلب، منتج، عميل...</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
        ⌘ K
      </kbd>
    </button>
  );
}

export function GlobalSearch({
  open,
  onOpenChange,
  results,
  groups = ["الصفحات", "البائعون", "الطلبات", "الإجراءات السريعة"],
  emptyMessage = "لا توجد نتائج.",
  onResultSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: GlobalSearchResult[];
  groups?: string[];
  emptyMessage?: string;
  onResultSelect?: (result: GlobalSearchResult) => void;
}) {
  const router = useRouter();
  const grouped = React.useMemo(() => {
    const map = new Map<string, GlobalSearchResult[]>();
    groups.forEach((g) => map.set(g, []));
    results.forEach((r) => {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)?.push(r);
    });
    return map;
  }, [groups, results]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="بحث"
    >
      <CommandInput placeholder="ابحث في اللوحة..." />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {Array.from(grouped.entries()).map(([group, items], index) =>
          items.length > 0 ? (
            <React.Fragment key={group}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.hint ?? ""}`}
                    onSelect={() => {
                      onResultSelect?.(item);
                      if (item.href) {
                        router.push(item.href);
                      } else if (item.onSelect) {
                        item.onSelect();
                      }
                      onOpenChange(false);
                    }}
                  >
                    <span className="flex-1 truncate">
                      <span className="block font-semibold">{item.label}</span>
                      {item.hint ? (
                        <span className="block text-[11px] text-ink-muted">
                          {item.hint}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ) : null,
        )}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-ink-muted">
        <span>
          اضغط <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd> للفتح
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="h-7 px-2 text-[11px]"
        >
          إغلاق
        </Button>
      </div>
    </CommandDialog>
  );
}
