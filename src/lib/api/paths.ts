export function withQuery(
  path: string,
  params: Record<string, string | number | undefined | null>,
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const adminPaths = {
  analyticsOverview: (days = 30) =>
    withQuery("/api/admin/admin/analytics/overview", { days }),
  analyticsTopProducts: (days = 30, limit = 8) =>
    withQuery("/api/admin/admin/analytics/top-products", { days, limit }),
  analyticsVendorRanking: (days = 30, limit = 8) =>
    withQuery("/api/admin/admin/analytics/vendor-ranking", { days, limit }),
  analyticsWelcomeSummary: (days = 30) =>
    withQuery("/api/admin/admin/analytics/welcome-summary", { days }),
  analyticsPendingPayoutsTotal: () =>
    "/api/admin/admin/analytics/pending-payouts-total",
  analyticsActiveAlertsCount: () =>
    "/api/admin/admin/analytics/active-alerts-count",
  opsQueues: () => "/api/admin/admin/ops/queues",
  opsHealth: () => "/api/admin/admin/ops/health",
  opsActivityFeed: (limit = 6) =>
    withQuery("/api/admin/admin/ops/activity-feed", { limit }),
  opsAlerts: (severity?: "critical" | "warning" | "info", limit = 10) =>
    withQuery("/api/admin/admin/ops/alerts", { severity, limit }),
  billingOverview: () => "/api/admin/admin/billing/overview",
  billingCommissionBreakdown: (groupBy: "category" | "vendor" | "tier" = "category") =>
    withQuery("/api/admin/admin/billing/commission-breakdown", { groupBy }),
  payouts: (status?: "PENDING" | "PAID" | "FAILED" | "REJECTED", limit = 20) =>
    withQuery("/api/admin/admin/payouts", { status, limit }),
  payoutsMarkPaid: (payoutId: string) =>
    `/api/admin/admin/payouts/${encodeURIComponent(payoutId)}/mark-paid`,
  payoutsReject: (payoutId: string) =>
    `/api/admin/admin/payouts/${encodeURIComponent(payoutId)}/reject`,
  vendors: (params: Record<string, string | undefined> = {}) => {
    const filtered: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") filtered[k] = v;
    });
    const search = new URLSearchParams(filtered).toString();
    return search ? `/api/admin/admin/vendors?${search}` : "/api/admin/admin/vendors";
  },
  vendorDetail: (vendorId: string) =>
    `/api/admin/admin/vendors/${encodeURIComponent(vendorId)}`,
  vendorStatus: (vendorId: string) =>
    `/api/admin/vendors/${encodeURIComponent(vendorId)}/status`,
  vendorVerifications: (vendorId: string) =>
    `/api/admin/admin/vendors/${encodeURIComponent(vendorId)}/verifications`,
  vendorVerification: (vendorId: string, verificationId: string | number) =>
    `/api/admin/vendors/${encodeURIComponent(vendorId)}/verifications/${encodeURIComponent(String(verificationId))}`,
  vendorSuspend: (vendorId: string) =>
    `/api/admin/admin/vendors/${encodeURIComponent(vendorId)}/suspend`,
  vendorReinstate: (vendorId: string) =>
    `/api/admin/admin/vendors/${encodeURIComponent(vendorId)}/reinstate`,
  vendorsGeoBreakdown: (country = "EG", limit = 20) =>
    withQuery("/api/admin/admin/vendors/geo-breakdown", { country, limit }),
  verifications: (params: Record<string, string | undefined> = {}) => {
    const filtered: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") filtered[k] = v;
    });
    const search = new URLSearchParams(filtered).toString();
    return search
      ? `/api/admin/admin/verifications?${search}`
      : "/api/admin/admin/verifications";
  },
  verificationsQueue: (limit = 4) =>
    withQuery("/api/admin/admin/verifications", { status: "PENDING", limit }),
  verificationsReview: (verificationId: string) =>
    `/api/admin/admin/verifications/${encodeURIComponent(verificationId)}/review`,
  auditLogs: (limit = 8) =>
    withQuery("/api/admin/admin/audit-logs", { limit }),
  auditLogsExport: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/audit-logs/export", params),
  reportsExport: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/reports/export", params),
  notificationsBroadcast: () => "/api/admin/admin/notifications/broadcast",
  commissionsRates: () => "/api/admin/admin/commissions/rates",
  commissionsRatesBulk: () => "/api/admin/admin/commissions/rates/bulk",
  analyticsRevenueTrends: (
    interval: "daily" | "weekly" = "daily",
    from?: string,
    to?: string,
  ) =>
    withQuery("/api/admin/admin/analytics/revenue-trends", {
      interval,
      from,
      to,
    }),
  analyticsFunnel: () => "/api/admin/admin/analytics/funnel",
  vendorNotify: (vendorId: string) =>
    `/api/admin/admin/vendors/${encodeURIComponent(vendorId)}/notify`,
  subscriptionsStats: () => "/api/admin/admin/subscriptions/stats",
  subscriptionsExpiring: (limit = 20) =>
    withQuery("/api/admin/admin/subscriptions/expiring", { limit }),
  auditLogDiff: (logId: string) =>
    `/api/admin/admin/audit-logs/${encodeURIComponent(String(logId))}/diff`,
  mediaOrphans: (limit = 20) =>
    withQuery("/api/admin/admin/media/orphans", { limit }),
  mediaPurge: () => "/api/admin/admin/media/purge",
  settingsMaintenance: () => "/api/admin/admin/settings/maintenance",
  adminUsers: () => "/api/admin/admin/users",
  // Orders
  adminOrders: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/orders", params),
  adminOrderDetail: (orderId: string) =>
    `/api/admin/admin/orders/${encodeURIComponent(orderId)}`,
  adminOrderStatus: (orderId: string) =>
    `/api/admin/admin/orders/${encodeURIComponent(orderId)}/status`,
  adminOrderCancel: (orderId: string) =>
    `/api/admin/admin/orders/${encodeURIComponent(orderId)}/cancel`,
  adminOrderEvents: (orderId: string) =>
    `/api/admin/admin/orders/${encodeURIComponent(orderId)}/events`,
  adminOrderSplitStatus: (splitId: string) =>
    `/api/admin/admin/order-splits/${encodeURIComponent(splitId)}/status`,
  orderPayments: (orderId: string) =>
    `/api/admin/orders/${encodeURIComponent(orderId)}/payments`,
  // Payments & refunds
  adminPayments: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/payments", params),
  paymentDetail: (paymentId: string) =>
    `/api/admin/payments/${encodeURIComponent(paymentId)}`,
  adminRefunds: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/refunds", params),
  adminRefundDetail: (refundId: string) =>
    `/api/admin/admin/refunds/${encodeURIComponent(refundId)}`,
  // Resolutions (returns & disputes)
  adminResolutions: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/resolutions", params),
  adminResolutionDetail: (publicId: string) =>
    `/api/admin/admin/resolutions/${encodeURIComponent(publicId)}`,
  // Bulk orders
  bulkOrders: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/bulk/orders", params),
  bulkOrderDetail: (bulkOrderId: string) =>
    `/api/admin/bulk/orders/${encodeURIComponent(bulkOrderId)}`,
  // Products
  adminProducts: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/products", params),
  adminProductDetail: (productId: string) =>
    `/api/admin/products/${encodeURIComponent(productId)}`,
  adminProductAvailability: (productId: string) =>
    `/api/admin/products/${encodeURIComponent(productId)}/availability`,
  // Catalog
  categories: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/categories", params),
  categoryDetail: (categoryId: string) =>
    `/api/admin/categories/${encodeURIComponent(categoryId)}`,
  categoryAttributes: (categoryId: string) =>
    `/api/admin/categories/${encodeURIComponent(categoryId)}/attributes`,
  brands: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/brands", params),
  brandDetail: (brandId: string) =>
    `/api/admin/brands/${encodeURIComponent(brandId)}`,
  storeCategories: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/store-categories", params),
  storeCategoryDetail: (storeCategoryId: string) =>
    `/api/admin/store-categories/${encodeURIComponent(storeCategoryId)}`,
  // Roles
  roles: () => "/api/admin/roles",
  rolesAssign: () => "/api/admin/roles/assign",
  userRoleRevoke: (userId: string, roleId: number) =>
    `/api/admin/roles/users/${encodeURIComponent(userId)}/roles/${roleId}`,
  // Reviews
  adminReviews: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/reviews", params),
  // Promotions & banners
  promotions: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/promotions", params),
  promotionDetail: (promotionId: string) =>
    `/api/admin/admin/promotions/${encodeURIComponent(promotionId)}`,
  banners: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/banners", params),
  bannerDetail: (bannerId: string) =>
    `/api/admin/admin/banners/${encodeURIComponent(bannerId)}`,
  // Settings & vendor billing
  adminSettings: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/admin/settings", params),
  vendorBillingRun: () => "/api/admin/admin/vendor-billing/run",
  // Shipping
  shippingZones: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/shipping/zones", params),
  shippingMethods: (params: Record<string, string | undefined> = {}) =>
    withQuery("/api/admin/shipping/methods", params),
  shippingAdminZones: () => "/api/admin/shipping/admin/zones",
  shippingAdminMethods: () => "/api/admin/shipping/admin/methods",
  shippingQuote: () => "/api/admin/shipping/quote",
  vendorShippingRates: (vendorId: string) =>
    `/api/admin/vendors/${encodeURIComponent(vendorId)}/shipping-rates`,
  // Users
  adminUserStatus: (userId: string) =>
    `/api/admin/admin/users/${encodeURIComponent(userId)}/status`,
  adminUserDetail: (userId: string) =>
    `/api/admin/admin/users/${encodeURIComponent(userId)}`,
  // Products
  adminProductStatus: (productId: string) =>
    `/api/admin/admin/products/${encodeURIComponent(productId)}/status`,
  // Reviews
  adminReviewDetail: (reviewId: string) =>
    `/api/admin/admin/reviews/${encodeURIComponent(reviewId)}`,
  // Subscription plans
  subscriptionPlans: () => "/api/admin/admin/subscription-plans",
  subscriptionPlanDetail: (planId: string) =>
    `/api/admin/admin/subscription-plans/${encodeURIComponent(planId)}`,
  // Commission rates
  commissionRateDetail: (ruleId: string) =>
    `/api/admin/admin/commissions/rates/${encodeURIComponent(ruleId)}`,
  // Locations (kind: countries | cities | areas)
  locationDetail: (kind: "countries" | "cities" | "areas", id: string) =>
    `/api/admin/admin/locations/${kind}/${encodeURIComponent(id)}`,
  // Shipping admin detail (mutations)
  shippingAdminZoneDetail: (zoneId: string) =>
    `/api/admin/shipping/admin/zones/${encodeURIComponent(zoneId)}`,
  shippingAdminMethodDetail: (methodId: string) =>
    `/api/admin/shipping/admin/methods/${encodeURIComponent(methodId)}`,
};
