export const queryKeys = {
  me: ["auth", "me"] as const,
  roles: ["roles"] as const,
  users: (params: Record<string, string | undefined>) =>
    ["users", params] as const,
  vendors: (params: Record<string, string | undefined>) =>
    ["vendors", params] as const,
  vendorDetail: (vendorId: string) => ["vendors", vendorId] as const,
  vendorVerifications: (vendorId: string) =>
    ["vendors", vendorId, "verifications"] as const,
  verifications: (params: Record<string, string | undefined>) =>
    ["verifications", params] as const,
  reviews: (params: Record<string, string | undefined>) =>
    ["reviews", params] as const,
  resolutions: (params: Record<string, string | undefined>) =>
    ["resolutions", params] as const,
  auditLogs: (params: Record<string, string | undefined>) =>
    ["audit-logs", params] as const,
  payouts: (status?: string, limit = 20) =>
    ["payouts", status ?? "ALL", limit] as const,
  payoutSummary: ["payouts", "summary"] as const,
  commissions: ["commissions", "rates"] as const,
  dashboard: {
    overview: (days: number) => ["dashboard", "overview", days] as const,
    topProducts: (days: number, limit: number) =>
      ["dashboard", "top-products", days, limit] as const,
    vendorRanking: (days: number, limit: number) =>
      ["dashboard", "vendor-ranking", days, limit] as const,
    queues: ["dashboard", "queues"] as const,
    auditLogs: (limit: number) => ["dashboard", "audit-logs", limit] as const,
    billingCycle: ["dashboard", "billing-cycle"] as const,
    commissionBreakdown: (groupBy: string) =>
      ["dashboard", "commission-breakdown", groupBy] as const,
    welcomeSummary: (days: number) =>
      ["dashboard", "welcome-summary", days] as const,
    pendingPayoutsTotal: ["dashboard", "pending-payouts-total"] as const,
    activeAlertsCount: ["dashboard", "active-alerts-count"] as const,
    kycQueue: (limit: number) => ["dashboard", "kyc-queue", limit] as const,
    activityFeed: (limit: number) => ["dashboard", "activity-feed", limit] as const,
    systemAlerts: (severity?: string, limit = 10) =>
      ["dashboard", "system-alerts", severity ?? "ALL", limit] as const,
    systemHealth: ["dashboard", "system-health"] as const,
    vendorGeo: (country: string, limit: number) =>
      ["dashboard", "vendor-geo", country, limit] as const,
    recentVendors: (limit: number) =>
      ["dashboard", "recent-vendors", limit] as const,
    revenueTrends: (interval: string, from?: string, to?: string) =>
      ["dashboard", "revenue-trends", interval, from ?? "", to ?? ""] as const,
    funnel: ["dashboard", "funnel"] as const,
    subscriptionsStats: ["dashboard", "subscriptions-stats"] as const,
    subscriptionsExpiring: (limit: number) =>
      ["dashboard", "subscriptions-expiring", limit] as const,
    mediaOrphans: (limit: number) =>
      ["dashboard", "media-orphans", limit] as const,
    maintenance: ["settings", "maintenance"] as const,
  },
  auditLogDiff: (logId: string) => ["audit-logs", logId, "diff"] as const,
  // Centralized list/detail keys for resources previously using ad-hoc paths
  orders: (params: Record<string, string | undefined>) => ["orders", params] as const,
  orderDetail: (orderId: string) => ["orders", orderId] as const,
  orderPayments: (orderId: string) => ["orders", orderId, "payments"] as const,
  payments: (params: Record<string, string | undefined>) => ["payments", params] as const,
  paymentDetail: (paymentId: string) => ["payments", paymentId] as const,
  refunds: (params: Record<string, string | undefined>) => ["refunds", params] as const,
  products: (params: Record<string, string | undefined>) => ["products", params] as const,
  productDetail: (productId: string) => ["products", productId] as const,
  productAvailability: (productId: string) =>
    ["products", productId, "availability"] as const,
  categories: (params: Record<string, string | undefined>) => ["categories", params] as const,
  categoryDetail: (categoryId: string) => ["categories", categoryId] as const,
  categoryAttributes: (categoryId: string) =>
    ["categories", categoryId, "attributes"] as const,
  brands: (params: Record<string, string | undefined>) => ["brands", params] as const,
  storeCategories: (params: Record<string, string | undefined>) =>
    ["store-categories", params] as const,
  promotions: (params: Record<string, string | undefined>) => ["promotions", params] as const,
  promotionDetail: (promotionId: string) => ["promotions", promotionId] as const,
  banners: (params: Record<string, string | undefined>) => ["banners", params] as const,
  bannerDetail: (bannerId: string) => ["banners", bannerId] as const,
  shippingZones: ["shipping", "zones"] as const,
  shippingMethods: ["shipping", "methods"] as const,
  vendorShippingRates: (vendorId: string) =>
    ["vendors", vendorId, "shipping-rates"] as const,
  adminSettings: ["settings"] as const,
  adminQueues: ["ops", "queues"] as const,
  bulkOrders: (params: Record<string, string | undefined>) =>
    ["bulk-orders", params] as const,
  bulkOrderDetail: (bulkOrderId: string) => ["bulk-orders", bulkOrderId] as const,
};
