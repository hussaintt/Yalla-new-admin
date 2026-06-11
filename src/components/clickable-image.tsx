"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ClickableImageProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
  onError?: () => void;
}

export function ClickableImage({ src, alt = "Image", className = "", thumbnailClassName = "", onError }: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setScale(1);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const zoomIn = () => setScale((s) => Math.min(4, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const resetZoom = () => setScale(1);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in transition-all duration-200 hover:opacity-90 ${thumbnailClassName} ${className}`}
        onClick={() => setIsOpen(true)}
        onError={onError}
      />

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={handleClose}
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
                <button
                  type="button"
                  onClick={zoomOut}
                  className="rounded-full bg-ink-strong/80 p-2 transition-colors hover:bg-ink-strong"
                  title="تصغير"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="rounded-full bg-ink-strong/80 p-2 transition-colors hover:bg-ink-strong"
                  title="تكبير"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="rounded-full bg-ink-strong/80 p-2 transition-colors hover:bg-ink-strong"
                  title="إعادة ضبط الحجم"
                >
                  <Maximize className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="ms-2 rounded-full bg-destructive p-2 text-destructive-foreground transition-colors hover:bg-destructive/90"
                  title="إغلاق (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex max-h-[80vh] max-w-full items-center justify-center overflow-auto rounded-2xl border border-border bg-ink-strong shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                style={{ transform: `scale(${scale})` }}
                className="max-h-[75vh] max-w-full object-contain transition-transform duration-200 ease-out"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
