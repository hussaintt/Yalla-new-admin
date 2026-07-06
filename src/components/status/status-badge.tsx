import { cn } from "@/lib/utils";

type Tone = "green" | "yellow" | "red" | "blue" | "gray" | "purple" | "orange";

const statusGroups: Record<Tone, string[]> = {
  green: ["ACTIVE", "APPROVED", "PAID", "DELIVERED", "COMPLETED", "SUCCESS", "PUBLISHED", "ENABLED", "DUE", "OPEN"],
  yellow: ["PENDING", "PROCESSING", "AWAITING_REVIEW", "REVIEW", "DRAFT", "ON_HOLD"],
  red: ["REJECTED", "FAILED", "SUSPENDED", "CANCELLED", "CANCELED", "BLOCKED", "DISABLED"],
  blue: ["NOTIFICATION_SENT", "IN_PROGRESS", "INFO", "SHIPMENT_TRACKING", "CREATED", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
  purple: ["SCHEDULED", "QUEUED"],
  orange: ["AWAITING_PAYMENT", "PAYMENT_DUE", "RETURNED", "EXCEPTION"],
  gray: ["ARCHIVED", "EXPIRED", "INACTIVE", "DELETED"],
};

const statusLabels: Record<string, string> = {
  ACTIVE: "نشط",
  APPROVED: "معتمد",
  PAID: "مدفوع",
  DELIVERED: "تم التسليم",
  COMPLETED: "مكتمل",
  SUCCESS: "ناجح",
  PUBLISHED: "منشور",
  ENABLED: "مفعل",
  DUE: "مستحق",
  OPEN: "مفتوح",
  PENDING: "قيد الانتظار",
  PROCESSING: "قيد المعالجة",
  AWAITING_REVIEW: "بانتظار المراجعة",
  REVIEW: "تحت المراجعة",
  DRAFT: "مسودة",
  ON_HOLD: "معلق",
  REJECTED: "مرفوض",
  FAILED: "فشل",
  SUSPENDED: "موقوف",
  CANCELLED: "ملغي",
  CANCELED: "ملغي",
  BLOCKED: "محظور",
  DISABLED: "معطل",
  ARCHIVED: "مؤرشف",
  EXPIRED: "منتهي",
  INACTIVE: "غير نشط",
  DELETED: "محذوف",
  AWAITING_PAYMENT: "يستحق الدفع",
  PAYMENT_DUE: "مستحق الدفع",
  NOTIFICATION_SENT: "تم الإرسال",
  IN_PROGRESS: "جارٍ التنفيذ",
  INFO: "معلومة",
  SCHEDULED: "مجدول",
  QUEUED: "في الطابور",
  SHIPMENT_TRACKING: "تحديث الشحن",
  CREATED: "تم الإنشاء",
  IN_TRANSIT: "في الطريق",
  OUT_FOR_DELIVERY: "في طريقها للتسليم",
  RETURNED: "مرتجعة",
  EXCEPTION: "تعذّر التسليم",
};

const toneClass: Record<Tone, string> = {
  green: "bg-success-soft text-success",
  yellow: "bg-warning-soft text-warning",
  red: "bg-destructive-soft text-destructive",
  blue: "bg-info-soft text-info",
  purple: "bg-brand-purple-50 text-brand-purple",
  orange: "bg-brand-orange-50 text-brand-orange",
  gray: "bg-muted text-ink-muted",
};

function toneFor(status: string): Tone {
  const normalized = status.toUpperCase();
  for (const tone of Object.keys(statusGroups) as Tone[]) {
    if (statusGroups[tone].includes(normalized)) return tone;
  }
  return "blue";
}

function labelForStatus(status: string) {
  const normalized = status.toUpperCase();
  return statusLabels[normalized] ?? status.replaceAll("_", " ");
}

export function StatusBadge({
  status,
  withPulse = true,
  className,
}: {
  status: string;
  withPulse?: boolean;
  className?: string;
}) {
  const tone = toneFor(status);
  return (
    <span
      title={status}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold",
        toneClass[tone],
        className,
      )}
    >
      {withPulse ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {labelForStatus(status)}
    </span>
  );
}
