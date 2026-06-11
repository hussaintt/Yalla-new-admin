# Backend Gaps for the Redesigned Admin Panel

This is the gap list the redesigned admin (matching `admin-dashboard.html`) needs from
`YallaNewBackendV2`. Items already covered by existing endpoints (KYC list/detail/review,
audit logs list, queues, analytics overview, top products, vendor ranking) are
reused as-is and excluded from this doc.

## Conventions

- All routes are prefixed with `/v1/admin/...` unless noted.
- All authenticated routes require `Authorization: Bearer <accessToken>` (handled by the BFF).
- `CursorPage<T>` = `{ data: T[], nextCursor?: string, hasMore: boolean }`.
- Monetary values are **integer minor units (cents/piastres)** with an accompanying `currency` string.
- Times are ISO-8601 UTC.
- Arabic copy in this doc is for the admin UI only — backend responses are locale-agnostic.

---

## 1. Billing Cycle & Commission Breakdown

Powers the right column of the dashboard's financial card and `/billing/overview`.

### 1.1 GET /v1/admin/billing/cycles/current
- **Auth:** `billing:read` (or `billing:write`).
- **Response:**
```json
{
  "id": "cycle_2026_06",
  "label": "يونيو 2026",
  "startsAt": "2026-06-01T00:00:00Z",
  "endsAt": "2026-06-30T23:59:59Z",
  "closesAt": "2026-07-05T23:59:59Z",
  "status": "ACTIVE",
  "collectedCents": 28745000,
  "expectedCents": 87000000,
  "currency": "EGP",
  "progressPct": 33,
  "daysRemaining": 20
}
```
- **Reason:** Powers the cycle progress card and the "دورة الفوترة الحالية" widget.
- **Priority:** P0

### 1.2 GET /v1/admin/billing/cycles/current/commission-breakdown
- **Query:** `?groupBy=category` (default) | `vendor` | `tier`.
- **Response:**
```json
{
  "currency": "EGP",
  "totalCents": 28745000,
  "slices": [
    { "key": "electronics", "label": "إلكترونيات", "amountCents": 12072900, "pct": 42 },
    { "key": "fashion", "label": "أزياء", "amountCents": 8048600, "pct": 28 },
    { "key": "food", "label": "أطعمة ومشروبات", "amountCents": 5174100, "pct": 18 },
    { "key": "other", "label": "أخرى", "amountCents": 3449400, "pct": 12 }
  ]
}
```
- **Reason:** Stacked bar in the dashboard + Commission-by-category report.
- **Priority:** P0

### 1.3 POST /v1/admin/billing/cycles/:cycleId/close
- **Request body:** `{ confirm: true, notes?: string }`.
- **Response:** `{ id, status: "CLOSED", closedAt }`.
- **Errors:** `409 CYCLE_ALREADY_CLOSED`, `409 CYCLE_HAS_UNPAID_DUES`, `400 BALANCE_MISMATCH`.
- **Reason:** "إغلاق دورة فوترة" quick action. Idempotent + writes `audit_log`.
- **Priority:** P0

---

## 2. System Health & Activity Feed

Powers the bottom row of the dashboard.

### 2.1 GET /v1/admin/ops/health
- **Response:**
```json
{
  "overall": "OK",
  "checkedAt": "2026-06-10T11:46:00Z",
  "services": [
    { "key": "api_gateway", "label": "API Gateway", "status": "OK", "latencyMs": 124, "uptimePct": 99.98, "meta": "99.98% uptime" },
    { "key": "database", "label": "قاعدة البيانات", "status": "OK", "latencyMs": 8, "uptimePct": 99.99, "meta": "62% استخدام • 1,247 اتصال" },
    { "key": "payment_gateway", "label": "بوابة الدفع", "status": "WARN", "latencyMs": 312, "uptimePct": 99.95, "meta": "142 عملية/ساعة" },
    { "key": "notifications", "label": "خدمة الإشعارات", "status": "OK", "latencyMs": 41, "uptimePct": 99.99, "meta": "8,432 إشعار اليوم" },
    { "key": "cdn", "label": "التخزين السحابي (CDN)", "status": "OK", "latencyMs": 22, "uptimePct": 100, "meta": "847 GB مستخدم من 2 TB" },
    { "key": "platform_uptime", "label": "معدل توفر المنصة (30 يوم)", "status": "OK", "latencyMs": null, "uptimePct": 99.97, "meta": "آخر حادث: 12 يوم مضت" }
  ]
}
```
- **Reason:** "صحة النظام" widget. `WARN` -> amber pill, `DOWN` -> red pill.
- **Priority:** P0

### 2.2 GET /v1/admin/ops/activity-feed
- **Query:** `?limit=10&before=<cursor>`.
- **Response (CursorPage):**
```json
{
  "data": [
    {
      "id": "evt_01HXX...",
      "type": "vendor.registered",
      "icon": "vendor",
      "tone": "vendor",
      "actor": { "id": "u_123", "name": "حسين تاجر" },
      "subjectId": "v_oyko",
      "subjectLabel": "Oyko Store",
      "text": "سجل كبائع جديد وينتظر الموافقة",
      "amountCents": null,
      "currency": null,
      "createdAt": "2026-06-10T09:46:00Z"
    },
    {
      "id": "evt_01HXX...",
      "type": "order.placed",
      "icon": "order",
      "tone": "order",
      "actor": null,
      "subjectId": "ord_cmq6kyfu40037",
      "subjectLabel": "#cmq6kyfu40037",
      "text": "طلب جديد بقيمة 100,050 ج.م",
      "amountCents": 10005000,
      "currency": "EGP",
      "createdAt": "2026-06-10T08:46:00Z"
    },
    {
      "id": "evt_01HXX...",
      "type": "commission.collected",
      "icon": "payment",
      "tone": "payment",
      "actor": null,
      "subjectId": "v_oyko",
      "subjectLabel": "Oyko",
      "text": "تم تحصيل عمولة 15,000 ج.م",
      "amountCents": 1500000,
      "currency": "EGP",
      "createdAt": "2026-06-10T06:46:00Z"
    },
    {
      "id": "evt_01HXX...",
      "type": "complaint.opened",
      "icon": "alert",
      "tone": "alert",
      "actor": { "id": "u_555", "name": "هاني ع." },
      "subjectId": "v_techzone",
      "subjectLabel": "TechZone",
      "text": "شكوى عميل — تأخير في الشحن",
      "amountCents": 1250000,
      "currency": "EGP",
      "createdAt": "2026-06-10T04:46:00Z"
    },
    {
      "id": "evt_01HXX...",
      "type": "kyc.approved",
      "icon": "kyc",
      "tone": "kyc",
      "actor": { "id": "admin_3", "name": "أحمد سمير" },
      "subjectId": "v_nile_krafts",
      "subjectLabel": "Nile Krafts",
      "text": "تم اعتماد KYC بنجاح",
      "amountCents": null,
      "currency": null,
      "createdAt": "2026-06-09T19:30:00Z"
    },
    {
      "id": "evt_01HXX...",
      "type": "vendor.suspended",
      "icon": "vendor",
      "tone": "alert",
      "actor": { "id": "admin_1", "name": "محمد admin" },
      "subjectId": "v_fakebrand",
      "subjectLabel": "FakeBrand X",
      "text": "تم إيقاف لانتهاك سياسات المنصة",
      "amountCents": null,
      "currency": null,
      "createdAt": "2026-06-09T14:15:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```
- **Supported `type` values:** `vendor.registered`, `vendor.approved`, `vendor.suspended`,
  `kyc.submitted`, `kyc.approved`, `kyc.rejected`, `order.placed`, `order.cancelled`,
  `order.refunded`, `commission.collected`, `payout.paid`, `complaint.opened`,
  `complaint.resolved`, `admin.login`, `admin.action`.
- **Reason:** "سجل النشاط المباشر" widget. Cursor-paginated, DESC by `createdAt`. Recommend
  a single denormalized `activity_events` table or a view unioning the relevant domain tables.
- **Priority:** P0

### 2.3 GET /v1/admin/ops/alerts
- **Query:** `?severity=critical|warning|info&limit=10`.
- **Response:**
```json
{
  "data": [
    {
      "id": "alert_01HXX...",
      "severity": "critical",
      "icon": "alert",
      "title": "شكوى عميل ضد TechZone — تأخير 5 أيام",
      "description": "العميل هاني ع. يطلب استرداد 12,500 ج.م. البائع لم يرد منذ 48 ساعة.",
      "amountCents": 1250000,
      "currency": "EGP",
      "actionUrl": "/complaints/c_123",
      "createdAt": "2026-06-10T09:46:00Z"
    },
    {
      "id": "alert_01HXX...",
      "severity": "warning",
      "icon": "warning",
      "title": "23 طلب KYC تجاوزوا SLA 24 ساعة",
      "description": "متوسط وقت المراجعة الحالي: 38 ساعة. الهدف: أقل من 24 ساعة.",
      "actionUrl": "/verifications?status=PENDING",
      "createdAt": "2026-06-10T06:46:00Z"
    },
    {
      "id": "alert_01HXX...",
      "severity": "info",
      "icon": "info",
      "title": "دورة الفوترة ستغلق خلال 20 يوم",
      "description": "12 بائع لم يسددوا عمولاتهم بعد. الإجمالي المستحق: 87,300 ج.م",
      "actionUrl": "/billing/overview",
      "createdAt": "2026-06-10T03:00:00Z"
    }
  ],
  "counts": { "critical": 1, "warning": 1, "info": 1 }
}
```
- **Reason:** "تنبيهات تحتاج انتباهك" widget. Derive from existing tables
  (open complaints, KYC SLA breaches, billing cycle proximity).
- **Priority:** P0

---

## 3. Pending Payouts (Vendor Payout Queue)

Powers the "مدفوعات معلقة للبائعين" KPI and the `/payouts` page.

### 3.1 GET /v1/admin/payouts
- **Query:** `?status=PENDING|PAID|FAILED|REJECTED&limit=20&cursor=<c>`.
- **Response (CursorPage):**
```json
{
  "data": [
    {
      "id": "po_01HXX...",
      "vendorId": "v_oyko",
      "vendorName": "Oyko Store",
      "amountCents": 1500000,
      "currency": "EGP",
      "status": "PENDING",
      "method": "BANK_TRANSFER",
      "bankName": "CIB",
      "bankAccountLast4": "1234",
      "requestedAt": "2026-06-08T10:00:00Z",
      "cycleId": "cycle_2026_05"
    }
  ],
  "nextCursor": "...",
  "hasMore": true,
  "summary": { "pendingTotalCents": 8730000, "pendingCount": 12, "currency": "EGP" }
}
```
- **Reason:** P0. List page + the "تحتاج إجراء" KPI total.

### 3.2 POST /v1/admin/payouts/:payoutId/mark-paid
- **Body:** `{ transactionReference: string, notes?: string, paidAt?: ISODate }`.
- **Response:** `{ id, status: "PAID", transactionReference, paidAt }`.
- **Errors:** `409 ALREADY_PAID`, `409 INVALID_BANK_DETAILS`, `404 PAYOUT_NOT_FOUND`.
- **Side effects:** writes `audit_log`, emits `payout.paid` activity event, decrements vendor balance.
- **Priority:** P0

### 3.3 POST /v1/admin/payouts/:payoutId/reject
- **Body:** `{ reason: string }`.
- **Response:** `{ id, status: "REJECTED", rejectedAt, reason }`.
- **Reason:** Reverse the payout ticket and re-credit vendor balance.
- **Priority:** P1

---

## 4. Vendor Suspension (KYC + Policy Actions)

Powers the "حظر/إيقاف" quick action and the "إيقاف" buttons in tables.

### 4.1 POST /v1/admin/vendors/:vendorId/suspend
- **Body:** `{ reason: string, notifyVendor?: boolean }`.
- **Response:** `{ id, status: "SUSPENDED", suspendedAt, reason }`.
- **Side effects:** hides vendor from public marketplace, voids outstanding payouts, logs audit row,
  emits `vendor.suspended` activity.
- **Errors:** `409 ALREADY_SUSPENDED`, `403 VENDOR_HAS_ACTIVE_ORDERS` (configurable; allow
  override with `?force=true`).
- **Priority:** P0

### 4.2 POST /v1/admin/vendors/:vendorId/reinstate
- **Body:** `{ notes?: string }`.
- **Response:** `{ id, status: "ACTIVE" | "PENDING_REVIEW" }`.
- **Reason:** Reverse a suspension.
- **Priority:** P1

---

## 5. Vendor Geo Breakdown

Powers the "التوزيع الجغرافي للبائعين" widget.

### 5.1 GET /v1/admin/vendors/geo-breakdown
- **Query:** `?country=EG&limit=20`.
- **Response:**
```json
{
  "data": [
    { "regionCode": "Cairo", "regionLabel": "القاهرة", "vendorCount": 487, "pct": 39, "max": 487 },
    { "regionCode": "Giza", "regionLabel": "الجيزة", "vendorCount": 242, "pct": 19, "max": 487 },
    { "regionCode": "Alexandria", "regionLabel": "الإسكندرية", "vendorCount": 198, "pct": 16, "max": 487 },
    { "regionCode": "Mansoura", "regionLabel": "المنصورة", "vendorCount": 94, "pct": 8, "max": 487 },
    { "regionCode": "Asyut", "regionLabel": "أسيوط", "vendorCount": 72, "pct": 6, "max": 487 },
    { "regionCode": "other", "regionLabel": "باقي المحافظات", "vendorCount": 154, "pct": 12, "max": 487 }
  ],
  "total": 1247
}
```
- **Reason:** Bar chart on the dashboard and the geo report.
- **Priority:** P1

### 5.2 GET /v1/admin/vendors/geo-breakdown.geojson
- **Response:** GeoJSON FeatureCollection of Egyptian governorates with `vendorCount` property.
  Powers the "خريطة" button.
- **Priority:** P2

---

## 6. Commission Rate Management

Powers the "تعديل عمولة" quick action and the `/commissions` page.

### 6.1 GET /v1/admin/commissions/rates
- **Response:**
```json
{
  "currency": "EGP",
  "defaultRatePct": 10,
  "rules": [
    { "id": "r_1", "scope": "category", "scopeKey": "electronics", "ratePct": 10, "effectiveFrom": "2026-01-01" },
    { "id": "r_2", "scope": "category", "scopeKey": "fashion", "ratePct": 10, "effectiveFrom": "2026-01-01" },
    { "id": "r_3", "scope": "category", "scopeKey": "food", "ratePct": 12, "effectiveFrom": "2026-01-01" },
    { "id": "r_4", "scope": "vendor", "scopeKey": "v_seha", "ratePct": 7, "effectiveFrom": "2026-03-01" }
  ]
}
```
- **Priority:** P1

### 6.2 PATCH /v1/admin/commissions/rates/:ruleId
- **Body:** `{ ratePct: number, effectiveFrom?: ISODate, notes?: string }`.
- **Validation:** `0 <= ratePct <= 50`. `ratePct` change > 5% requires `?confirm=true`.
- **Response:** updated rule.
- **Side effects:** writes audit log, optionally emits notification to affected vendors.
- **Priority:** P1

### 6.3 POST /v1/admin/commissions/rates
- **Body:** `{ scope: "category"|"vendor", scopeKey, ratePct, effectiveFrom? }`.
- **Response:** created rule.
- **Priority:** P1

---

## 7. Notifications (Broadcast)

Powers the "إرسال إشعار" quick action and the `/notifications` page.

### 7.1 POST /v1/admin/notifications/broadcast
- **Body:**
```json
{
  "channel": "PUSH" | "EMAIL" | "SMS",
  "audience": "ALL_VENDORS" | "ALL_CUSTOMERS" | { "filter": "vendor.status=ACTIVE" },
  "title": "string",
  "body": "string",
  "actionUrl": "string?",
  "scheduledAt": "ISODate?"
}
```
- **Response:** `{ id, status: "QUEUED"|"SENT"|"SCHEDULED", estimatedRecipients: number }`.
- **Validation:** `audience` filter must be server-validated; reject unknown filter keys.
- **Reason:** P1. Drives the global notification composer.

### 7.2 GET /v1/admin/notifications
- **Query:** `?status=&channel=&limit=20&cursor=`.
- **Response:** CursorPage of past broadcasts with delivery stats.
- **Priority:** P2

---

## 8. Reports / Export

Powers the "تصدير تقرير" quick action and the `/reports` page.

### 8.1 GET /v1/admin/reports/export
- **Query:** `?type=overview|revenue|vendors|orders&from=&to=&format=csv|xlsx|pdf`.
- **Response:** Binary stream (`text/csv`, `application/vnd.openxmlformats-...spreadsheetml.sheet`,
  or `application/pdf`) with Content-Disposition filename.
- **Reason:** P1. Pairs with the existing `/uploads/*` rewrite; the BFF streams the binary
  response unchanged.

### 8.2 GET /v1/admin/reports/available
- **Response:** list of report types with localized titles, default columns, and required params.
- **Priority:** P2

---

## 9. KPI Aggregates (small, cheap)

Powers the welcome banner copy and 3 of the KPI cards.

### 9.1 GET /v1/admin/analytics/pending-payouts-total
- **Response:** `{ amountCents, currency, vendorCount }`.
- **Reason:** Powers the "مدفوعات معلقة" KPI without listing payouts.
- **Priority:** P0

### 9.2 GET /v1/admin/analytics/active-alerts-count
- **Response:** `{ critical, warning, info, total }`.
- **Reason:** Powers the "تحذيرات وتحقيقات نشطة" KPI and the welcome banner
  "X تحذيرات تحتاج انتباهك".
- **Priority:** P0

### 9.3 GET /v1/admin/analytics/welcome-summary
- **Response:**
```json
{
  "newVendorsInWindow": 84,
  "ordersInWindow": 1247,
  "commissionInWindowCents": 28745000,
  "currency": "EGP",
  "pendingKyc": 23,
  "activeAlerts": 3,
  "windowDays": 30
}
```
- **Reason:** One cheap call that fills the welcome banner copy.
- **Priority:** P0

---

## Summary of Priorities

| Priority | Items |
| --- | --- |
| **P0 — blocks dashboard v1** | §1.1, §1.2, §1.3, §2.1, §2.2, §2.3, §3.1, §3.2, §4.1, §9.1, §9.2, §9.3 |
| **P1 — next sprint** | §3.3, §4.2, §5.1, §6.1, §6.2, §6.3, §7.1, §8.1 |
| **P2 — nice-to-have** | §5.2, §7.2, §8.2 |
