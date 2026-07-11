import { z } from "zod";

import type { Promotion } from "./types";

/**
 * Form values are human units (EGP amounts, whole percent, datetime-local
 * strings); conversion to the API's cents/bps/ISO shape happens in
 * `toPromotionApiBody`.
 */
export const promotionFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "كود الكوبون مطلوب")
      .max(50, "الكود يجب ألا يتجاوز 50 حرفاً")
      .regex(/^[A-Za-z0-9_-]+$/, "الكود يجب أن يتكون من حروف إنجليزية وأرقام فقط"),
    nameAr: z.string().trim().min(1, "اسم الكوبون بالعربية مطلوب"),
    nameEn: z.string().trim().optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
    percentValue: z.string().trim().optional().or(z.literal("")),
    maxDiscountEgp: z.string().trim().optional().or(z.literal("")),
    amountEgp: z.string().trim().optional().or(z.literal("")),
    minSubtotalEgp: z.string().trim().optional().or(z.literal("")),
    usageLimitTotal: z.string().trim().optional().or(z.literal("")),
    usageLimitPerUser: z.string().trim().optional().or(z.literal("")),
    validFrom: z.string().min(1, "تاريخ بداية الصلاحية مطلوب"),
    validUntil: z.string().optional().or(z.literal("")),
    status: z.enum(["DRAFT", "ACTIVE", "CANCELLED"]),
  })
  .superRefine((values, ctx) => {
    const addIssue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (values.discountType === "PERCENTAGE") {
      const pct = Number(values.percentValue);
      if (!values.percentValue || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
        addIssue("percentValue", "أدخل نسبة خصم بين 1 و 100");
      }
      if (values.maxDiscountEgp) {
        const cap = Number(values.maxDiscountEgp);
        if (!Number.isFinite(cap) || cap <= 0) {
          addIssue("maxDiscountEgp", "أدخل مبلغاً صحيحاً بالجنيه");
        }
      }
    }

    if (values.discountType === "FIXED") {
      const amount = Number(values.amountEgp);
      if (!values.amountEgp || !Number.isFinite(amount) || amount <= 0) {
        addIssue("amountEgp", "أدخل قيمة الخصم بالجنيه");
      }
    }

    if (values.minSubtotalEgp) {
      const min = Number(values.minSubtotalEgp);
      if (!Number.isFinite(min) || min < 0) {
        addIssue("minSubtotalEgp", "أدخل مبلغاً صحيحاً بالجنيه");
      }
    }

    for (const field of ["usageLimitTotal", "usageLimitPerUser"] as const) {
      if (values[field]) {
        const limit = Number(values[field]);
        if (!Number.isInteger(limit) || limit < 1) {
          addIssue(field, "أدخل عدداً صحيحاً 1 أو أكثر");
        }
      }
    }

    if (
      values.validUntil &&
      values.validFrom &&
      new Date(values.validUntil).getTime() <= new Date(values.validFrom).getTime()
    ) {
      addIssue("validUntil", "تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

const egpToCents = (value: string) => Math.round(Number(value) * 100);

/**
 * Convert form values to the backend body. Create omits empty optionals;
 * edit sends explicit nulls so clearing a cap/limit/end-date (or switching
 * discount type) actually removes the old value.
 */
export function toPromotionApiBody(
  values: PromotionFormValues,
  mode: "create" | "edit",
): Record<string, unknown> {
  const isEdit = mode === "edit";
  const orNull = <T>(value: T | undefined): T | null | undefined =>
    value !== undefined ? value : isEdit ? null : undefined;

  const nameAr = values.nameAr.trim();
  const body: Record<string, unknown> = {
    code: values.code.trim().toUpperCase(),
    name: { ar: nameAr, en: values.nameEn?.trim() || nameAr },
    discountType: values.discountType,
    scope: "PLATFORM",
    valueBps: orNull(
      values.discountType === "PERCENTAGE"
        ? Math.round(Number(values.percentValue) * 100)
        : undefined,
    ),
    valueCents: orNull(
      values.discountType === "FIXED" ? egpToCents(values.amountEgp ?? "") : undefined,
    ),
    maxDiscountCents: orNull(
      values.discountType === "PERCENTAGE" && values.maxDiscountEgp
        ? egpToCents(values.maxDiscountEgp)
        : undefined,
    ),
    minSubtotalCents: orNull(
      values.minSubtotalEgp ? egpToCents(values.minSubtotalEgp) : undefined,
    ),
    usageLimitTotal: orNull(
      values.usageLimitTotal ? Number(values.usageLimitTotal) : undefined,
    ),
    usageLimitPerUser: orNull(
      values.usageLimitPerUser ? Number(values.usageLimitPerUser) : undefined,
    ),
    validFrom: new Date(values.validFrom).toISOString(),
    validUntil: orNull(
      values.validUntil ? new Date(values.validUntil).toISOString() : undefined,
    ),
    status: values.status,
  };

  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function promotionToFormValues(
  promotion: Promotion | null,
): PromotionFormValues {
  if (!promotion) {
    return {
      code: "",
      nameAr: "",
      nameEn: "",
      discountType: "PERCENTAGE",
      percentValue: "",
      maxDiscountEgp: "",
      amountEgp: "",
      minSubtotalEgp: "",
      usageLimitTotal: "",
      usageLimitPerUser: "1",
      validFrom: toDatetimeLocal(new Date().toISOString()),
      validUntil: "",
      status: "ACTIVE",
    };
  }

  const name =
    typeof promotion.name === "object" && promotion.name !== null
      ? promotion.name
      : { ar: String(promotion.name ?? ""), en: "" };
  const centsToEgp = (cents: number | null) =>
    cents == null ? "" : String(cents / 100);

  return {
    code: promotion.code ?? "",
    nameAr: name.ar ?? "",
    nameEn: name.en ?? "",
    discountType: promotion.discountType,
    percentValue:
      promotion.valueBps == null ? "" : String(promotion.valueBps / 100),
    maxDiscountEgp: centsToEgp(promotion.maxDiscountCents),
    amountEgp: centsToEgp(promotion.valueCents),
    minSubtotalEgp: centsToEgp(promotion.minSubtotalCents),
    usageLimitTotal:
      promotion.usageLimitTotal == null ? "" : String(promotion.usageLimitTotal),
    usageLimitPerUser:
      promotion.usageLimitPerUser == null
        ? ""
        : String(promotion.usageLimitPerUser),
    validFrom: toDatetimeLocal(promotion.validFrom),
    validUntil: toDatetimeLocal(promotion.validUntil),
    status: promotion.status === "EXPIRED" ? "CANCELLED" : promotion.status,
  };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCouponCode(): string {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `YN-${suffix}`;
}
