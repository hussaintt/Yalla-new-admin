"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  toastMessage?: string;
}

export function CopyButton({
  value,
  className,
  toastMessage = "تم نسخ المعرّف بنجاح",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent triggering row click / select events
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ المعرّف");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "size-7 p-0 rounded-lg hover:bg-muted text-ink-muted hover:text-ink-strong transition-all",
        className,
      )}
      onClick={handleCopy}
      title="نسخ"
      type="button"
    >
      {copied ? (
        <Check className="size-3.5 text-success animate-in zoom-in duration-200" />
      ) : (
        <Copy className="size-3.5 transition-transform hover:scale-110" />
      )}
      <span className="sr-only">نسخ</span>
    </Button>
  );
}
