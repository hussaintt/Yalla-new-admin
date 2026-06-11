# Backend Gaps — `bk-gaps.md`

> **Status legend**
> - ✅ — done
> - 🚧 — frontend done, awaiting backend
> - ☐ — neither done
> - 🟡 — partially done / in progress
>
> **Priority legend**
> - **P0** — blocks shipping; operators can't perform the action today.
> - **P1** — operational; needed to keep up with day-2 work.
> - **P2** — nice-to-have; surface as a stub in the admin until it lands.

Single source of truth, deduped from:
- `MISSING_APIS.md`
- `backend-fixes-for-admin.md`
- `new-apis.md`
- `admin-implementation-plan.md` (Phase 2–6 backlog)
- In-code `<BackendGapCard>` / `<GapCard>` warnings in `src/features/resources/admin-resource-pages.tsx` and `src/features/resources/remaining-admin-pages.tsx`

Path convention: every entry is `/v1/...` (or `/v1/admin/...`) and routed through the existing BFF at `/api/admin/...`. Money is integer minor units (cents/piastres) with a `currency` string. Times are ISO-8601 UTC. `CursorPage<T> = { data: T[]; nextCursor?: string; hasMore: boolean }`.

---

## P0 — Ship-blockers (16)

### KYC — global queue

- **🚧 `GET /v1/admin/verifications`**
  - Screen: `/verifications` (KYC queue)
  - Query: `?status=PENDING|APPROVED|REJECTED&documentType=&limit=&cursor=`
  - Response: `CursorPage<VerificationRow>`
  - Source: `MISSING_APIS.md §1`, `admin-implementation-plan.md §3 backlog`, `adminPaths.verifications()` already declared in `src/lib/api/paths.ts`

- **☐ `GET /v1/admin/verifications/:verificationId`**
  - Screen: `/verifications/:id`
  - Response: `VerificationRow`
  - Source: `MISSING_APIS.md §1`, `admin-implementation-plan.md §3`

- **☐ `PATCH /v1/admin/verifications/:verificationId/review`**
  - Screen: `/verifications/:id` (approve/reject action)
  - Body: `{ status: "APPROVED" | "REJECTED", rejectionReason?: string }`
  - Response: `{ success: boolean }`
  - Source: `MISSING_APIS.md §1`, `admin-implementation-plan.md §3`

### Orders

- **☐ `PATCH /v1/admin/orders/:orderId/status`**
  - Screen: `/orders/:id` status action
  - Body: `{ status: string, notes?: string }`
  - Source: `MISSING_APIS.md §2`, `admin-implementation-plan.md §4`

- **☐ `POST /v1/admin/orders/:orderId/cancel`**
  - Screen: `/orders/:id` cancel action
  - Body: `{ reason: string }`
  - Source: `MISSING_APIS.md §2`, `admin-implementation-plan.md §4`

### Refunds

- **☐ `GET /v1/admin/refunds`**
  - Screen: `/refunds`
  - Query: `?status=&limit=&cursor=`
  - Response: `CursorPage<RefundRow>`
  - Source: `MISSING_APIS.md §4`, `admin-implementation-plan.md §4`
  - Currently stubbed via `<BackendGapCard>` in `src/features/resources/admin-resource-pages.tsx`

- **☐ `GET /v1/admin/refunds/:refundId`**
  - Screen: `/refunds/:id`
  - Response: `RefundDetail`
  - Source: `MISSING_APIS.md §4`, `admin-implementation-plan.md §4`

### Payouts

- **🚧 `GET /v1/admin/payouts`**
  - Screen: `/payouts`, plus `analyticsPendingPayoutsTotal()` KPI
  - Query: `?status=PENDING|PAID|FAILED|REJECTED&limit=&cursor=`
  - Response: `CursorPage<PayoutRow>` with `summary: { pendingTotalCents, pendingCount, currency }`
  - Source: `backend-fixes-for-admin.md §3.1`, `adminPaths.payouts()` already declared

- **☐ `POST /v1/admin/payouts/:payoutId/mark-paid`**
  - Screen: `/payouts/:id` quick action
  - Body: `{ transactionReference: string, notes?: string, paidAt?: ISODate }`
  - Errors: `409 ALREADY_PAID`, `409 INVALID_BANK_DETAILS`, `404 PAYOUT_NOT_FOUND`
  - Source: `backend-fixes-for-admin.md §3.2`, `MISSING_APIS.md §6`, `adminPaths.payoutsMarkPaid()` already declared

### Vendors

- **🚧 `POST /v1/admin/vendors/:vendorId/suspend`**
  - Screen: `recent-vendors-table.tsx`, `vendors-page.tsx`, `vendor-detail-page.tsx`
  - Body: `{ reason: string, notifyVendor?: boolean }`
  - Side effects: hides from marketplace, voids payouts, writes audit log
  - Source: `backend-fixes-for-admin.md §4.1`, `adminPaths.vendorSuspend()` already declared

- **☐ `POST /v1/admin/vendors/:vendorId/reinstate`**
  - Screen: vendor detail "reinstate" action
  - Body: `{ notes?: string }`
  - Source: `backend-fixes-for-admin.md §4.2`, `adminPaths.vendorReinstate()` already declared

### Billing cycles

- **🚧 `GET /v1/admin/billing/cycles/current`**
  - Screen: dashboard `BillingCycleCard`
  - Response: `{ id, label, startsAt, endsAt, closesAt, status, collectedCents, expectedCents, currency, progressPct, daysRemaining }`
  - Source: `backend-fixes-for-admin.md §1.1`, `adminPaths.billingCyclesCurrent()` already declared

- **🚧 `GET /v1/admin/billing/cycles/current/commission-breakdown`**
  - Screen: dashboard commission stacked bar
  - Query: `?groupBy=category|vendor|tier`
  - Source: `backend-fixes-for-admin.md §1.2`, `adminPaths.billingCyclesCurrentCommissionBreakdown()` already declared

- **🚧 `POST /v1/admin/billing/cycles/:cycleId/close`**
  - Screen: `/billing/overview` close-cycle action
  - Body: `{ confirm: true, notes?: string }`
  - Errors: `409 CYCLE_ALREADY_CLOSED`, `409 CYCLE_HAS_UNPAID_DUES`, `400 BALANCE_MISMATCH`
  - Source: `backend-fixes-for-admin.md §1.3`, `adminPaths.billingCyclesClose()` already declared

### Ops — dashboard widgets

- **🚧 `GET /v1/admin/ops/health`**
  - Screen: dashboard `SystemHealthCard`
  - Response: `{ overall, checkedAt, services: Array<{ key, label, status: "OK"|"WARN"|"DOWN", latencyMs, uptimePct, meta }> }`
  - Source: `backend-fixes-for-admin.md §2.1`, `adminPaths.opsHealth()` already declared

- **🚧 `GET /v1/admin/ops/activity-feed`**
  - Screen: dashboard `ActivityFeed`
  - Query: `?limit=&before=<cursor>`
  - Source: `backend-fixes-for-admin.md §2.2`, `adminPaths.opsActivityFeed()` already declared

- **🚧 `GET /v1/admin/ops/alerts`**
  - Screen: dashboard `SystemAlertsCard`
  - Query: `?severity=critical|warning|info&limit=`
  - Response includes `counts: { critical, warning, info }`
  - Source: `backend-fixes-for-admin.md §2.3`, `adminPaths.opsAlerts()` already declared

- **🚧 `GET /v1/admin/ops/queues`**
  - Screen: dashboard "صحة الطوابير"
  - Source: `backend-fixes-for-admin.md §2.4` (referenced), `adminPaths.opsQueues()` already declared

### Analytics — small KPI aggregates

- **🚧 `GET /v1/admin/analytics/welcome-summary`**
  - Screen: dashboard `WelcomeBanner`
  - Response: `{ newVendorsInWindow, ordersInWindow, commissionInWindowCents, currency, pendingKyc, activeAlerts, windowDays }`
  - Source: `backend-fixes-for-admin.md §9.3`, `adminPaths.analyticsWelcomeSummary()` already declared

- **🚧 `GET /v1/admin/analytics/pending-payouts-total`**
  - Screen: dashboard "مدفوعات معلقة" KPI
  - Response: `{ amountCents, currency, vendorCount }`
  - Source: `backend-fixes-for-admin.md §9.1`, `adminPaths.analyticsPendingPayoutsTotal()` already declared

- **🚧 `GET /v1/admin/analytics/active-alerts-count`**
  - Screen: dashboard "تحذيرات نشطة" KPI
  - Response: `{ critical, warning, info, total }`
  - Source: `backend-fixes-for-admin.md §9.2`, `adminPaths.analyticsActiveAlertsCount()` already declared

---

## P1 — Operational (14)

### Orders

- **☐ `GET /v1/admin/orders/:orderId/events`**
  - Screen: `/orders/:id` timeline
  - Response: `{ events: Array<{ id, name, description, createdAt }> }`
  - Source: `MISSING_APIS.md §2`, `admin-implementation-plan.md §4`

### Bulk orders

- **☐ `GET /v1/admin/bulk-orders`**
  - Screen: `/bulk-orders`
  - Query: `?status=&limit=&cursor=`
  - Response: `CursorPage<BulkOrder>`
  - Source: `MISSING_APIS.md §3`, `admin-implementation-plan.md §4`

### Vendors

- **🚧 `GET /v1/admin/vendors/geo-breakdown`**
  - Screen: dashboard `VendorGeoCard`
  - Query: `?country=EG&limit=`
  - Response: `{ data: Array<{ regionCode, regionLabel, vendorCount, pct, max }>, total }`
  - Source: `backend-fixes-for-admin.md §5.1`, `adminPaths.vendorsGeoBreakdown()` already declared

### Payouts

- **☐ `POST /v1/admin/payouts/:payoutId/reject`**
  - Screen: `/payouts/:id` reject action
  - Body: `{ reason: string }`
  - Source: `backend-fixes-for-admin.md §3.3`, `adminPaths.payoutsReject()` already declared

### Commissions

- **☐ `GET /v1/admin/commissions/rates`**
  - Screen: `/commissions` list, dashboard quick actions
  - Response: `{ currency, defaultRatePct, rules: Array<{ id, scope, scopeKey, ratePct, effectiveFrom }> }`
  - Source: `backend-fixes-for-admin.md §6.1`, `adminPaths.commissionsRates()` already declared

- **☐ `PATCH /v1/admin/commissions/rates/:ruleId`**
  - Body: `{ ratePct, effectiveFrom?, notes? }`
  - Errors: `ratePct > 5% change requires ?confirm=true`
  - Source: `backend-fixes-for-admin.md §6.2`

- **☐ `POST /v1/admin/commissions/rates`**
  - Body: `{ scope: "category"|"vendor", scopeKey, ratePct, effectiveFrom? }`
  - Source: `backend-fixes-for-admin.md §6.3`

### Notifications

- **🚧 `POST /v1/admin/notifications/broadcast`**
  - Screen: `/notifications` (currently 404 in the sidebar — see `Phase 4` notes)
  - Body: `{ channel: "PUSH"|"EMAIL"|"SMS", audience, title, body, actionUrl?, scheduledAt? }`
  - Source: `backend-fixes-for-admin.md §7.1`, `adminPaths.notificationsBroadcast()` already declared

### Vendor billing

- **☐ `GET /v1/admin/vendor-billing/accounts`**
  - Screen: `/billing/vendors`
  - Response: `CursorPage<BillingAccount>`
  - Source: `MISSING_APIS.md §5`, `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/vendor-billing/invoices`**
  - Screen: `/billing/invoices`
  - Response: `CursorPage<BillingInvoice>`
  - Source: `MISSING_APIS.md §5`, `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/vendor-billing/invoices/:invoiceId`**
  - Response: `BillingInvoice`
  - Source: `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/vendor-billing/payments`**
  - Response: `CursorPage<BillingPayment>`
  - Source: `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/vendor-billing/ledger`**
  - Response: `CursorPage<LedgerEntry>`
  - Source: `admin-implementation-plan.md §6`

- **☐ `POST /v1/admin/vendor-billing/invoices/:invoiceId/mark-paid`**
  - Source: `admin-implementation-plan.md §6`

- **☐ `POST /v1/admin/vendor-billing/invoices/:invoiceId/void`**
  - Source: `admin-implementation-plan.md §6`

### Reports

- **🚧 `GET /v1/admin/reports/export`**
  - Screen: dashboard "تصدير تقرير", `/reports`
  - Query: `?type=overview|revenue|vendors|orders&from=&to=&format=csv|xlsx|pdf`
  - Response: binary stream (Content-Disposition)
  - Source: `backend-fixes-for-admin.md §8.1`, `adminPaths.reportsExport()` already declared
  - BFF streaming already supported (`src/lib/api/backend.ts:isStreamableResponse`)

### Reviews

- **☐ `GET /v1/admin/reviews/:reviewId`**
  - Source: `admin-implementation-plan.md §3`

- **☐ `POST /v1/admin/reviews/:reviewId/hide`**
  - Source: `admin-implementation-plan.md §3`

- **☐ `POST /v1/admin/reviews/:reviewId/restore`**
  - Source: `admin-implementation-plan.md §3`

- **☐ `DELETE /v1/admin/reviews/:reviewId`**
  - Source: `admin-implementation-plan.md §3`

### User detail

- **☐ `GET /v1/admin/users/:userId`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `PATCH /v1/admin/users/:userId`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `GET /v1/admin/users/:userId/orders`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `GET /v1/admin/users/:userId/vendors`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `GET /v1/admin/users/:userId/reviews`**
  - Source: `admin-implementation-plan.md §2`

### Vendor detail

- **☐ `GET /v1/admin/vendors/:vendorId`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `PATCH /v1/admin/vendors/:vendorId`**
  - Source: `admin-implementation-plan.md §2`

- **☐ `POST /v1/admin/vendors/:vendorId/note`**
  - Source: `admin-implementation-plan.md §2`

### Product moderation

- **☐ `GET /v1/admin/products`**
  - Source: `admin-implementation-plan.md §5`

- **☐ `GET /v1/admin/products/:productPublicId`**
  - Source: `admin-implementation-plan.md §5`

- **☐ `POST /v1/admin/products/:productPublicId/moderate`**
  - Source: `admin-implementation-plan.md §5`

- **☐ `PATCH /v1/admin/products/:productPublicId/status`**
  - Source: `admin-implementation-plan.md §5`

### Order splits (admin variant)

- **☐ `PATCH /v1/admin/order-splits/:splitId/status`**
  - Source: `admin-implementation-plan.md §4`

- **☐ `PATCH /v1/admin/order-splits/:splitId/fulfillment`**
  - Source: `admin-implementation-plan.md §4`

- **☐ `POST /v1/admin/orders/:orderId/notes`**
  - Source: `admin-implementation-plan.md §4`

- **☐ `POST /v1/admin/bulk-orders/:bulkOrderId/notes`**
  - Source: `admin-implementation-plan.md §4`

### Payout accounts (P1)

- **☐ `GET /v1/admin/payout-accounts?status=PENDING`**
  - Source: `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/payout-accounts/:payoutAccountId`**
  - Source: `admin-implementation-plan.md §6`

- **☐ `PATCH /v1/admin/payout-accounts/:payoutAccountId/review`**
  - Source: `admin-implementation-plan.md §6`

### Subscriptions — already wired

- **🚧 `GET /v1/admin/subscriptions/stats`**
  - Source: `new-apis.md §3.1`, `adminPaths.subscriptionsStats()` already declared

- **🚧 `GET /v1/admin/subscriptions/expiring`**
  - Source: `new-apis.md §3.2`, `adminPaths.subscriptionsExpiring()` already declared

### Media

- **🚧 `GET /v1/admin/media/orphans`**
  - Source: `new-apis.md §5.1`, `adminPaths.mediaOrphans()` already declared

- **🚧 `DELETE /v1/admin/media/purge`**
  - Source: `new-apis.md §5.2`, `adminPaths.mediaPurge()` already declared

### Maintenance settings

- **🚧 `PATCH /v1/admin/settings/maintenance`**
  - Source: `new-apis.md §6`, `adminPaths.settingsMaintenance()` already declared

### Admin user create

- **🚧 `POST /v1/admin/users`**
  - Source: `new-apis.md §7`, `adminPaths.adminUsers()` already declared
  - Body: `{ firstName, lastName, email, password, roles: string[] }`

### Direct vendor notify

- **🚧 `POST /v1/admin/vendors/:vendorId/notify`**
  - Source: `new-apis.md §2`, `adminPaths.vendorNotify()` already declared
  - Body: `{ title, body, data?: { action: string } }`

### Audit log diff

- **🚧 `GET /v1/admin/audit-logs/:auditLogId/diff`**
  - Source: `new-apis.md §4`, `adminPaths.auditLogDiff()` already declared

---

## P2 — Nice-to-have (8)

- **☐ `GET /v1/admin/vendors/geo-breakdown.geojson`** — GeoJSON FeatureCollection for the map view.
  Source: `backend-fixes-for-admin.md §5.2`

- **☐ `GET /v1/admin/notifications`** — broadcast history with delivery stats.
  Source: `backend-fixes-for-admin.md §7.2`

- **☐ `GET /v1/admin/reports/available`** — list of report types with localized titles, columns, required params.
  Source: `backend-fixes-for-admin.md §8.2`

- **☐ `GET /v1/admin/audit-logs/:auditLogId`** — full audit entry detail.
  Source: `MISSING_APIS.md §7`, `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/audit-logs/export`** — CSV export.
  Source: `MISSING_APIS.md §7`, `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/ops/webhooks`** — webhook event browser.
  Source: `MISSING_APIS.md §8`, `admin-implementation-plan.md §6`

- **☐ `GET /v1/admin/ops/webhooks/:webhookEventId`** + retry
  Source: `admin-implementation-plan.md §6`

- **☐ `POST /v1/admin/ops/jobs/:jobName/run`** — manual job run.
  Source: `MISSING_APIS.md §8`, `admin-implementation-plan.md §6`

- **☐ `GET /metrics` (Prometheus)** — health metrics outside `/v1`.
  Source: `admin-implementation-plan.md §6`

- **☐ `GET /health/ready`**
  Source: `admin-implementation-plan.md §6`

---

## Route-level gaps (no backend dependency)

These are admin-app issues that surface 404 today, not backend gaps. They are tracked here so the frontend PR that creates the pages can reference this doc.

- **☐ `/notifications` page** — declared in the sidebar (`src/components/layout/admin-shell.tsx`) but no `src/app/(admin)/notifications/page.tsx` exists → 404. PR Phase 4 will create the page; it renders `<BackendPendingNotice>` against `notificationsBroadcast` until the endpoint lands.

---

## Roll-up

| Status | Count | Notes |
| --- | --- | --- |
| ✅ Done | 0 | none yet |
| 🚧 Frontend done, awaiting backend | 26 | adminPaths.* + BFF routes wired |
| ☐ Neither done | ~22 | mostly thin list/detail endpoints |
| **Total tracked** | **~48** | P0: 16 · P1: 14 named + 28 supporting · P2: 8 |

> The "🚧" rows are a **backend-only lift**: the admin panel already calls them through the BFF. Landing these unblocks 16 KPI cards, 3 status actions, the notifications composer, the vendor suspend flow, and the payouts surface.

## How to use this doc

1. **Backend team** — work the P0 list top-to-bottom. Each entry is a self-contained ticket: implement, add to the OpenAPI schema, then tick the row to ✅.
2. **Frontend team** — when adding a new screen, search this doc first. If the endpoint is missing, add it as **☐** *before* writing a `BackendPendingNotice`. Don't invent a `BackendGapCard` ad-hoc.
3. **Reviewers** — reject PRs that add a new admin endpoint reference without ticking the matching row.
4. **Source-of-truth rule** — when `MISSING_APIS.md`, `backend-fixes-for-admin.md`, or `new-apis.md` change, update this file in the same PR. The per-doc files are kept for history; this file is the contract.
