import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

const rankPalette: Record<"gold" | "silver" | "bronze" | "default", string> = {
  gold: "bg-gradient-to-br from-brand-yellow-300 to-amber-500 text-white",
  silver: "bg-muted text-ink-strong ring-1 ring-inset ring-border",
  bronze: "bg-gradient-to-br from-orange-300 to-orange-700 text-white",
  default: "bg-muted text-ink-muted",
};

export function VendorRow({
  rank,
  avatar,
  avatarClassName,
  logoUrl,
  name,
  category,
  revenue,
  orders,
  sparkline,
  className,
}: {
  rank: number;
  avatar: React.ReactNode;
  avatarClassName?: string;
  logoUrl?: string | null;
  name: React.ReactNode;
  category: React.ReactNode;
  revenue: React.ReactNode;
  orders?: React.ReactNode;
  sparkline?: number[];
  className?: string;
}) {
  const rankTone: keyof typeof rankPalette =
    rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "default";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 transition hover:bg-surface-muted",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-[26px] place-items-center rounded-lg text-[11px] font-extrabold",
          rankPalette[rankTone],
        )}
      >
        {rank}
      </div>
      <Avatar
        className={cn(
          "size-10 shrink-0 rounded-full text-[13px] font-extrabold text-white",
          avatarClassName ?? "bg-gradient-to-br from-primary to-brand-teal-600",
        )}
      >
        {logoUrl ? <AvatarImage src={logoUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback className="bg-transparent text-[13px] font-extrabold text-white">
          {avatar}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-ink-strong">{name}</div>
        <div className="mt-0.5 text-[11px] text-ink-muted">{category}</div>
      </div>
      {sparkline ? <Sparkline values={sparkline} /> : null}
      <div className="text-left">
        <div className="text-[13px] font-extrabold text-primary">{revenue}</div>
        {orders ? (
          <div className="mt-0.5 text-[10px] text-ink-muted">{orders}</div>
        ) : null}
      </div>
    </div>
  );
}
