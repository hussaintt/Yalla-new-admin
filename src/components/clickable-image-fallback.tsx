import { ExternalLink, FileText, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ClickableImage } from "./clickable-image";

interface ClickableImageWithFileFallbackProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackLabel?: string;
  noWrapper?: boolean;
}

function normalizeFileSrc(src: string) {
  if (!src) return src;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return src;
  }
  return `/api/admin/files/${src}`;
}

export function ClickableImageWithFileFallback({
  src,
  alt = "مستند",
  className = "",
  fallbackLabel = "عرض المستند",
  noWrapper = false,
}: ClickableImageWithFileFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const normalizedSrc = useMemo(() => normalizeFileSrc(src), [src]);
  const lowerSrc = normalizedSrc.toLowerCase();
  const isPdf =
    lowerSrc.endsWith(".pdf") ||
    lowerSrc.includes("/pdf") ||
    lowerSrc.includes("format=pdf") ||
    lowerSrc.includes("contenttype=application%2fpdf");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  if (isPdf || hasError) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-muted px-3 py-1.5 text-xs font-bold text-ink-strong shadow-sm transition hover:border-primary hover:bg-primary-soft cursor-pointer"
          title="معاينة المستند"
        >
          <FileText className="h-4 w-4 text-ink-muted" />
          <span>{fallbackLabel}</span>
          <ExternalLink className="h-3 w-3 text-ink-soft" />
        </button>

        {isModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative flex w-full max-w-7xl max-h-screen flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-12 left-0 right-0 flex items-center justify-between gap-2 px-2 text-primary-foreground">
                <span className="truncate text-sm font-medium max-w-xs md:max-w-md" dir="rtl">
                  {alt}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={normalizedSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-ink-strong/80 p-2 text-primary-foreground transition-colors hover:bg-ink-strong"
                    title="فتح في علامة تبويب جديدة"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="ms-2 rounded-full bg-destructive p-2 text-destructive-foreground transition-colors hover:bg-destructive/90 cursor-pointer"
                    title="إغلاق (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex w-full max-h-[80vh] max-w-full items-center justify-center overflow-auto rounded-2xl border border-border bg-ink-strong p-1 shadow-2xl">
                {isPdf ? (
                  <iframe
                    src={normalizedSrc}
                    className="h-[75vh] min-h-[400px] w-full rounded border-none bg-card"
                    title={alt}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={normalizedSrc}
                    alt={alt}
                    className="max-h-[75vh] max-w-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (noWrapper) {
    return (
      <ClickableImage
        src={normalizedSrc}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
      <ClickableImage
        src={normalizedSrc}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
