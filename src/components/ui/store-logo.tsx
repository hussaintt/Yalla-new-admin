import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function storeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") return "؟";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * A store/seller logo. Renders the real logo from the backend when available and
 * falls back to the store's initials (also when the image fails to load — the
 * underlying Radix Avatar swaps to the fallback automatically).
 */
export function StoreLogo({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-9 rounded-xl", className)}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          "rounded-xl bg-primary-soft text-[11px] font-bold text-primary",
          fallbackClassName,
        )}
      >
        {storeInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
