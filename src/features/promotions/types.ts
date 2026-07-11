import type { CursorPage } from "@/lib/api/pagination";

export type PromotionStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type PromotionDiscountType = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";

export interface Promotion {
  publicId: string;
  code: string | null;
  name: { ar?: string; en?: string } | string;
  description?: { ar?: string; en?: string } | string | null;
  discountType: PromotionDiscountType;
  scope: string;
  valueBps: number | null;
  valueCents: number | null;
  minSubtotalCents: number | null;
  maxDiscountCents: number | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  validFrom: string;
  validUntil: string | null;
  status: PromotionStatus;
  createdAt: string;
}

export type PromotionPage = CursorPage<Promotion>;

/** A coupon whose DB status is still ACTIVE but whose end date has passed
 * (no background job flips statuses, so expiry is derived client-side). */
export function isPromotionExpired(promotion: Promotion): boolean {
  return (
    promotion.status === "ACTIVE" &&
    Boolean(promotion.validUntil) &&
    new Date(promotion.validUntil as string).getTime() < Date.now()
  );
}
