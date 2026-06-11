import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { UploadCloud, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  purpose: string;
  required?: boolean;
}

export function ImageUploadInput({
  label,
  value,
  onChange,
  purpose,
  required,
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(value.startsWith("http") ? value : `/api/admin/files/${value}`);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("الملف كبير جداً. الحد الأقصى 5 ميجابايت");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/files/upload?purpose=${purpose}`, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || "فشل تحميل الملف");
      }

      const result = (await response.json()) as { publicId?: string; id?: string; url?: string };
      const uploadedId = result.publicId ?? result.id ?? result.url;
      if (uploadedId) {
        onChange(uploadedId);
        toast.success("تم تحميل الصورة بنجاح");
      } else {
        throw new Error("لم يتم إرجاع معرف الملف");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الصورة");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-ink-strong">
        {label}
        {required ? <span className="text-destructive me-1">*</span> : null}
      </label>

      <div className="flex items-center gap-4">
        {previewUrl ? (
          <div className="group relative h-24 w-44 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={() => {
                setPreviewUrl(null);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-ink-strong/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-full bg-destructive p-2 text-destructive-foreground shadow-md transition-colors hover:bg-destructive/90"
                title="إزالة الصورة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex h-24 w-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card transition-all hover:border-primary hover:bg-primary-soft/40 disabled:opacity-50 cursor-pointer",
            )}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium text-ink-muted">جاري الرفع...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-ink-soft">
                <UploadCloud className="h-6 w-6 text-ink-soft" />
                <span className="text-xs font-semibold text-ink-muted">اختر صورة</span>
              </div>
            )}
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <div className="space-y-1 text-xs text-ink-muted">
          <div>الصيغ المقبولة: JPG, PNG, WEBP</div>
          <div>الحد الأقصى للملف: 5 ميجابايت</div>
          {value ? (
            <div className="mt-1 flex max-w-[160px] items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-ink-muted select-all">
              <span>ID:</span>
              <span className="truncate" title={value}>{value}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
