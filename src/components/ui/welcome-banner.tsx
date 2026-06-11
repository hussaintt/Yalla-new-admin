import * as React from "react";
import { Download, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WelcomeBanner({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  primaryAction?: { label: string; onClick?: () => void; href?: string; icon?: React.ElementType };
  secondaryAction?: { label: string; onClick?: () => void; href?: string; icon?: React.ElementType };
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-brand-teal-600 to-brand-teal-500 p-7 text-primary-foreground shadow-lg shadow-primary/20",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute -top-10 -left-10 size-50 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.4),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute -bottom-15 right-[30%] size-60 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_70%)]"
      />
      <div className="relative z-[2] flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="grid size-16 place-items-center rounded-[18px] border border-white/25 bg-white/15 backdrop-blur-md">
          <Sparkles className="size-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-[22px] font-extrabold">{title}</h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-7 text-[#ccebe6]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {primaryAction ? (
            <Button
              asChild
              variant="primary"
              size="lg"
              className="bg-brand-orange text-white shadow-lg shadow-brand-orange/40 hover:bg-brand-orange-700"
            >
              {primaryAction.href ? (
                <a href={primaryAction.href}>
                  {primaryAction.icon ? <primaryAction.icon className="size-4" /> : <Plus className="size-4" />}
                  {primaryAction.label}
                </a>
              ) : (
                <span onClick={primaryAction.onClick}>
                  {primaryAction.icon ? <primaryAction.icon className="size-4" /> : <Plus className="size-4" />}
                  {primaryAction.label}
                </span>
              )}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="border border-white/30 bg-white/15 text-white hover:bg-white/25"
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>
                  {secondaryAction.icon ? <secondaryAction.icon className="size-4" /> : <Download className="size-4" />}
                  {secondaryAction.label}
                </a>
              ) : (
                <span onClick={secondaryAction.onClick}>
                  {secondaryAction.icon ? <secondaryAction.icon className="size-4" /> : <Download className="size-4" />}
                  {secondaryAction.label}
                </span>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
