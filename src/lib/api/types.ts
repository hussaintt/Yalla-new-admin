import type { CursorPage } from "@/lib/api/pagination";

export type Role = {
  id: number;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  createdAt?: string;
};

export type UserRole = {
  role?: Role;
  roleId?: number;
};

export type AdminUserRow = {
  id: number;
  publicId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  locale?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  roles?: UserRole[];
};

export type AdminVendorRow = {
  id: number;
  publicId: string;
  slug?: string;
  legalName?: string;
  displayName?: unknown;
  email?: string | null;
  phone?: string | null;
  storeType?: string | null;
  status: string;
  approvedAt?: string | null;
  createdAt?: string;
  approvedBy?: { publicId?: string; email?: string } | null;
  _count?: { products?: number; members?: number };
};

export type VendorDetail = AdminVendorRow & {
  description?: unknown;
  reviewCount?: number;
  ratingAverage?: unknown;
  defaultCurrency?: string;
  productCount?: number;
  commissionDefaultBps?: number | null;
};

export type ReviewRow = {
  publicId: string;
  rating: number;
  vendorRating?: number | null;
  deliveryRating?: number | null;
  title?: string | null;
  body?: string | null;
  status: string;
  helpfulCount?: number;
  vendorReply?: string | null;
  vendorReplyAt?: string | null;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  createdAt?: string;
  user?: {
    publicId?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  product?: {
    publicId?: string;
    slug?: string;
    title?: unknown;
  };
  vendor?: {
    publicId?: string;
    displayName?: unknown;
  };
};

export type VerificationRow = {
  id: number;
  documentType: string;
  documentNumber?: string | null;
  status: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
  fileUrl?: string | null;
  frontFileUrl?: string | null;
  backFileUrl?: string | null;
};

export type AuditLogRow = {
  id?: number;
  action?: string;
  targetType?: string;
  targetId?: number;
  createdAt?: string;
  actor?: { publicId?: string; email?: string };
};

export type AnalyticsOverview = {
  windowDays?: number;
  users?: { total?: number; createdInWindow?: number };
  vendors?: { pending?: number; approved?: number };
  orders?: { placedInWindow?: number; paidInWindow?: number };
  revenue?: { grossCents?: number; currency?: string };
};

export type TopProductRow = {
  product?: { publicId?: string; slug?: string; title?: unknown };
  quantity?: number;
  revenueCents?: number;
};

export type VendorRankingRow = {
  vendor?: { publicId?: string; slug?: string; displayName?: unknown; status?: string };
  splitCount?: number;
  totalCents?: number;
  vendorPayoutCents?: number;
  commissionCents?: number;
};

export type QueueSnapshot = Record<string, unknown>;

export type UserPage = CursorPage<AdminUserRow>;
export type VendorPage = CursorPage<AdminVendorRow>;
export type ReviewPage = CursorPage<ReviewRow>;
export type AuditLogPage = CursorPage<AuditLogRow>;

export type ResolutionEventRow = {
  publicId: string;
  type: string;
  note?: string | null;
  actorType: string;
  triggeredBy?: { publicId?: string; firstName?: string | null; lastName?: string | null } | null;
  createdAt?: string;
};

export type ResolutionAffectedItem = {
  orderItemId: string;
  quantity: number;
};

export type ResolutionRow = {
  publicId: string;
  caseNumber: string;
  type: "RETURN" | "DISPUTE" | string;
  status: string;
  reasonCode: string;
  description?: string | null;
  affectedItems?: ResolutionAffectedItem[] | null;
  returnTrackingNumber?: string | null;
  resolutionNote?: string | null;
  receivedAt?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  order?: { publicId?: string; orderNumber?: string; status?: string } | null;
  split?: { publicId?: string; status?: string } | null;
  vendor?: { publicId?: string; displayName?: unknown } | null;
  user?: { publicId?: string; firstName?: string | null; lastName?: string | null } | null;
  refund?: { publicId?: string; amountCents?: number; status?: string } | null;
  events?: ResolutionEventRow[];
};

export type ResolutionPage = CursorPage<ResolutionRow>;

export type BillingOverview = {
  currency: string;
  generatedAt: string;
  /** The month currently accruing commission — invoiced on the 1st of next month. */
  currentMonth: {
    label: string;
    accruedCommissionCents: number;
    orderCount: number;
    nextInvoiceAt: string;
  };
  /** The most recent automatic billing run (invoices for the previous month). */
  lastBilledPeriod: {
    label: string;
    issuedAt: string;
    periodStart: string;
    periodEnd: string;
    /** Day-6 payment deadline; unpaid vendors are suspended after this. */
    graceEndsAt: string;
    invoiceCount: number;
    totalCommissionCents: number;
    paidCents: number;
    balanceDueCents: number;
  } | null;
  /** Money owed right now across all periods. */
  outstanding: {
    invoiceCount: number;
    overdueInvoiceCount: number;
    balanceDueCents: number;
  };
  /** Vendors currently suspended for an unpaid overdue commission invoice. */
  restrictedVendorCount: number;
};

export type CommissionSlice = {
  key: string;
  label: string;
  amountCents: number;
  pct: number;
};

export type CommissionBreakdown = {
  currency: string;
  totalCents: number;
  slices: CommissionSlice[];
};

export type PendingPayoutsTotal = {
  amountCents: number;
  currency: string;
  vendorCount: number;
};

export type ActiveAlertsCount = {
  critical: number;
  warning: number;
  info: number;
  total: number;
};

export type WelcomeSummary = {
  newVendorsInWindow: number;
  ordersInWindow: number;
  commissionInWindowCents: number;
  currency: string;
  pendingKyc: number;
  activeAlerts: number;
  windowDays: number;
};

export type VendorGeoRow = {
  regionCode: string;
  regionLabel: string;
  vendorCount: number;
  pct: number;
  max: number;
};

export type VendorGeoBreakdown = {
  data: VendorGeoRow[];
  total: number;
};

export type SystemHealthService = {
  key: string;
  label: string;
  status: "OK" | "WARN" | "DOWN" | string;
  latencyMs?: number | null;
  uptimePct?: number | null;
  meta?: string;
};

export type SystemHealth = {
  overall: "OK" | "WARN" | "DOWN" | string;
  checkedAt: string;
  services: SystemHealthService[];
};

export type ActivityTone = "vendor" | "order" | "payment" | "alert" | "kyc" | "neutral";

export type ActivityItem = {
  id: string;
  type: string;
  icon: ActivityTone;
  tone: ActivityTone;
  actor?: { id?: string; name?: string } | null;
  subjectId?: string;
  subjectLabel?: string;
  text: string;
  amountCents?: number | null;
  currency?: string | null;
  createdAt: string;
};

export type ActivityFeed = {
  data: ActivityItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type SystemAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  icon?: "alert" | "warning" | "info" | string;
  title: string;
  description?: string;
  amountCents?: number | null;
  currency?: string | null;
  actionUrl?: string;
  createdAt: string;
};

export type SystemAlerts = {
  data: SystemAlert[];
  counts: { critical: number; warning: number; info: number };
};

export type KycQueueRow = {
  id: string | number;
  publicId?: string;
  vendorName: string;
  vendorLogoText?: string;
  vendorLogoGradient?: string;
  ownerName?: string;
  city?: string;
  category?: string;
  submittedAt?: string;
  submittedAtRelative?: string;
  status: string;
  href?: string;
};

export type DashboardPayoutSummary = {
  pendingTotalCents: number;
  pendingCount: number;
  currency: string;
};

export type PayoutRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REJECTED" | string;
  method?: string;
  bankName?: string;
  bankAccountLast4?: string;
  requestedAt?: string;
  cycleId?: string;
};

export type QuickAction = {
  key: string;
  label: string;
  href?: string;
  icon: string;
  iconClassName?: string;
  permission?: string;
};

export type FinancialChartPoint = {
  label: string;
  gmvCents: number;
  commissionCents: number;
  netCents: number;
};

export type FinancialChartData = {
  currency: string;
  period: "week" | "month" | "quarter" | "year";
  points: FinancialChartPoint[];
};

export type RevenueTrendsPoint = {
  date: string;
  grossCents: number;
  payoutCents: number;
  commissionCents: number;
};

export type RevenueTrendsResponse = {
  data: RevenueTrendsPoint[];
};

export type FunnelResponse = {
  pageViews: number;
  registrations: number;
  cartAdditions: number;
  checkoutInitiations: number;
  completedOrders: number;
};

export type VendorNotifyPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type VendorNotifyResponse = {
  vendorId: string;
  notifiedUsersCount: number;
  success: boolean;
};

export type SubscriptionsStats = {
  currency: string;
  mrrCents: number;
  activeSubscriptionsCount: number;
  trialingCount: number;
  pastDueCount: number;
  cancelledCount: number;
};

export type SubscriptionExpiring = {
  subscriptionId: string;
  vendorId: string;
  vendorName: string;
  planName: string;
  endsAt: string;
  priceCents: number;
  currency: string;
};

export type SubscriptionExpiringPage = CursorPage<SubscriptionExpiring>;

export type AuditLogDiff = {
  id: string;
  action: string;
  actor: { id: string; email: string };
  targetType: string;
  targetId: number | string;
  createdAt: string;
  diff: {
    previous: Record<string, unknown>;
    updated: Record<string, unknown>;
  };
};

export type MediaOrphan = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  createdAt: string;
};

export type MediaOrphansPage = CursorPage<MediaOrphan>;

export type MediaPurgeResponse = {
  purgedCount: number;
  spaceSavedBytes: number;
  success: boolean;
};

export type Setting = {
  id: number;
  publicId: string;
  group: string;
  key: string;
  value: string;
  type: string;
  isPublic: boolean;
  updatedAt: string;
};

export type MaintenanceSettings = {
  enabled: boolean;
  bannerMessage: string;
  updatedAt: string;
};

export type MaintenancePayload = {
  enabled: boolean;
  bannerMessage: string;
};

export type AdminUserCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
};

export type AdminUserCreateResponse = {
  id: number | string;
  publicId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
};
