# Yalla New Admin Panel Implementation Plan

## Purpose

Build `YallaNewAdmin` as the operational control panel for the Yalla New marketplace. The admin panel should help staff find and resolve work quickly: vendor approvals, KYC reviews, order issues, refunds, catalog upkeep, marketing content, billing reviews, queue health, and audit trails.

This plan converts the admin panel report into implementation work for a new Next.js admin app. As of this plan, `YallaNewAdmin` is empty, so Phase 0 includes project scaffolding.

## Ground Rules

- Keep this admin app independent from `YallNewApp` and `YallaNewBackendV2`.
- Treat `YallaNewBackendV2/Yalla.postman_collection.json` as the API contract source of truth.
- If the admin panel needs a new or changed backend endpoint, update the backend route/schema and the Postman collection in the backend project.
- The backend serves API routes under `/v1/...`; the admin app must call those paths through a small admin API proxy layer, not directly from browser components.
- Use public IDs in URLs and payloads wherever the backend exposes them. Do not depend on internal numeric IDs unless the existing contract currently does.

## Target Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui on top of Radix UI primitives
- TanStack Query for server state
- React Hook Form and Zod for forms
- Zustand for small client UI state
- Recharts for dashboards
- Playwright for end-to-end tests
- MSW for API mocking in component/integration tests
- OpenAPI type generation from backend `/docs/json` when the schema is complete enough

## Initial Scaffold

Run from the monorepo root:

```bash
cd /Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction
npx create-next-app@latest YallaNewAdmin \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd YallaNewAdmin
npm install @tanstack/react-query @tanstack/react-table zod react-hook-form @hookform/resolvers zustand recharts date-fns lucide-react sonner
npx shadcn@latest init
npm install -D msw @playwright/test openapi-typescript
```

Add scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test",
    "api:types": "openapi-typescript $BACKEND_OPENAPI_URL -o src/lib/api/generated/schema.d.ts"
  }
}
```

Recommended environment variables:

```bash
NEXT_PUBLIC_ADMIN_APP_NAME="Yalla New Admin"
YALLA_API_BASE_URL="http://localhost:3000"
BACKEND_OPENAPI_URL="http://localhost:3000/docs/json"
ADMIN_SESSION_COOKIE_NAME="yalla_admin_session"
ADMIN_REFRESH_COOKIE_NAME="yalla_admin_refresh"
```

## Security Architecture

Use a BFF-style layer:

```txt
Browser UI
  -> Next.js route handlers under /api/admin/...
  -> Yalla backend API under /v1/...
```

Rules:

- Store access and refresh tokens only in `httpOnly`, `secure`, `sameSite=lax` cookies.
- Never store admin tokens in `localStorage` or readable client state.
- Browser components call internal Next.js routes, not the backend directly.
- Next.js route handlers attach `Authorization: Bearer <token>` to backend calls.
- Refresh tokens through `POST /v1/auth/refresh` when the backend returns `401`.
- Middleware protects all `(admin)` routes and redirects unauthenticated users to `/login`.
- Admin pages must verify that `/v1/me` includes an admin-capable role before rendering.
- Dangerous actions require a confirmation dialog, a reason note, and a fresh password check once the backend supports it.

Current auth endpoints:

```txt
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
POST /v1/auth/logout-all
GET  /v1/me
```

## Proposed App Structure

```txt
src/
  app/
    (auth)/
      login/
        page.tsx
    (admin)/
      layout.tsx
      dashboard/
      users/
      vendors/
      verifications/
      products/
      catalog/
      orders/
      bulk-orders/
      reviews/
      payments/
      refunds/
      billing/
      shipping/
      promotions/
      banners/
      settings/
      audit-logs/
      ops/
    api/
      auth/
        login/route.ts
        logout/route.ts
        refresh/route.ts
        me/route.ts
      admin/
        [...path]/route.ts
  components/
    admin-shell/
    data-table/
    forms/
    layout/
    modals/
    status/
  features/
    analytics/
    audit-logs/
    auth/
    banners/
    billing/
    bulk-orders/
    catalog/
    dashboard/
    kyc/
    marketing/
    orders/
    payments/
    products/
    reviews/
    settings/
    shipping/
    users/
    vendors/
  lib/
    api/
      admin-client.ts
      backend-proxy.ts
      errors.ts
      generated/
      pagination.ts
      query-keys.ts
    auth/
      cookies.ts
      permissions.ts
      session.ts
    constants/
    formatters/
    schemas/
    utils/
```

## Admin Roles

Implement permission checks in UI first, then harden with backend role enforcement.

| Role | Primary access |
| --- | --- |
| Super Admin | Full access, settings, roles, billing, dangerous actions |
| Operations Admin | Orders, fulfillment, vendors, inventory |
| KYC Reviewer | Vendor and user verification queues |
| Catalog Manager | Categories, brands, products, attributes |
| Finance Admin | Payments, refunds, vendor billing, payouts |
| Support Agent | Users, orders, limited refunds, notes |
| Marketing Manager | Promotions, banners, content |
| Moderator | Reviews and product moderation |
| Read-only Analyst | Analytics, audit logs, reports |

Initial permission model:

```txt
dashboard:read
users:read
users:write
roles:write
vendors:read
vendors:write
kyc:review
orders:read
orders:write
reviews:moderate
payments:read
refunds:write
catalog:write
marketing:write
billing:write
settings:write
audit:read
ops:read
```

## Reusable UI Primitives

Build these before feature pages:

- `AdminShell`: sidebar, topbar, breadcrumbs, user menu, responsive navigation.
- `PermissionGate`: hides or disables UI based on roles/permissions.
- `CursorDataTable`: cursor pagination, search, filters, column visibility, row actions.
- `StatusBadge`: strict color mapping for statuses.
- `ConfirmActionDialog`: destructive and sensitive actions.
- `ReasonDialog`: action reason and optional notes.
- `EntityHeader`: page title, status, metadata, primary actions.
- `AuditTrailPanel`: reusable audit log list.
- `EmptyState`, `ErrorState`, `LoadingSkeleton`: consistent async states.
- `ExportCsvButton`: client-side CSV export for current query results first, backend export later.

Status color rules:

```txt
Green: active, approved, paid, delivered
Yellow: pending, processing, awaiting review
Red: rejected, failed, suspended, cancelled
Gray: archived, expired, inactive
Blue: informational
```

## API Integration Pattern

### Backend proxy

Create one generic proxy route for admin API calls:

```txt
src/app/api/admin/[...path]/route.ts
```

Responsibilities:

- Read admin access token from `httpOnly` cookie.
- Forward method, query string, JSON body, and multipart form data to `${YALLA_API_BASE_URL}/v1/...`.
- Attach request ID if present.
- Normalize backend errors into a frontend-friendly shape.
- On `401`, attempt refresh once and retry.
- Clear cookies and return `401` if refresh fails.

### Query conventions

- Store all query keys in `src/lib/api/query-keys.ts`.
- Every list query accepts `{ limit, cursor, q, filters }`.
- Use `data`, `nextCursor`, and `hasMore` envelopes where the backend provides them.
- Mutations invalidate the closest list and detail queries.
- Mutations must show loading, success, and error states.

### Forms

- Keep Zod schemas near each feature under `features/<module>/schemas.ts`.
- Use React Hook Form with `zodResolver`.
- Validate both client-side and server-side errors.
- Preserve Arabic/English fields where the backend supports localized content.

## Information Architecture

Recommended sidebar:

```txt
Dashboard
Users
Vendors
KYC & Verifications
Products
Catalog
Orders
Bulk Orders
Reviews
Payments & Refunds
Vendor Billing
Shipping
Promotions
Banners
Settings
Audit Logs
System Operations
```

Every major section should have:

- List page
- Detail page where the backend supports it
- Filters
- Row actions
- Safe bulk actions only
- CSV export
- Audit trail or recent activity panel
- Notes panel once backend notes exist

## Phased Delivery

### Phase 0 - Scaffold and Foundations

Goal: create the app and shared admin infrastructure.

Tasks:

- Scaffold Next.js app in `YallaNewAdmin`.
- Configure Tailwind and shadcn/ui.
- Add TanStack Query provider and global toaster.
- Add ESLint, TypeScript, Playwright, and MSW.
- Add `.env.example` for backend URL and cookie names.
- Implement `backend-proxy.ts`.
- Implement auth route handlers:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `GET /api/auth/me`
- Implement middleware for protected admin routes.
- Implement `AdminShell`, sidebar, topbar, and route groups.
- Implement `PermissionGate`.
- Implement reusable status, empty, loading, and error states.

Acceptance criteria:

- Admin can log in through `/login`.
- Auth cookies are `httpOnly`.
- Unauthenticated users cannot access `(admin)` routes.
- Non-admin users are blocked from admin pages.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass.

### Phase 1 - Data Tables and Dashboard

Goal: build the dashboard and table system used by later modules.

Current backend endpoints:

```txt
GET /v1/admin/analytics/overview?days=30
GET /v1/admin/analytics/top-products?days=30&limit=10
GET /v1/admin/analytics/vendor-ranking?days=30&limit=10
GET /v1/admin/ops/queues
GET /v1/admin/audit-logs?limit=20
```

Tasks:

- Build `CursorDataTable`.
- Build shared filter primitives: search input, date range, status select, reset filters.
- Build dashboard KPI cards:
  - GMV
  - paid orders
  - pending orders
  - pending vendor verifications
  - pending reviews
  - active vendors
  - failed payments
  - queue health
- Build charts:
  - sales over time
  - orders by status
  - top products
  - vendor ranking
- Build action queue cards:
  - KYC pending review
  - reviews pending moderation
  - delayed orders once backend supports filtering
  - billing payments pending review
  - failed payments
- Show recent audit logs.

Acceptance criteria:

- Dashboard loads live data from backend through the proxy.
- All widgets have loading, empty, and error states.
- Charts remain readable on desktop and tablet widths.
- Dashboard links route admins directly into filtered work queues.

### Phase 2 - Users, Roles, and Vendors

Goal: support basic account and vendor operations with the endpoints that already exist.

Current backend endpoints:

```txt
GET   /v1/admin/users?limit=20
PATCH /v1/admin/users/1/status
GET   /v1/roles
POST  /v1/roles
POST  /v1/roles/assign
DELETE /v1/roles/users/1/roles/2

GET   /v1/admin/vendors?limit=20
GET   /v1/vendors/{{vendorId}}
PATCH /v1/vendors/{{vendorId}}/status
GET   /v1/vendors/{{vendorId}}/members
POST  /v1/vendors/{{vendorId}}/members
DELETE /v1/vendors/{{vendorId}}/members/5
GET   /v1/vendors/{{vendorId}}/analytics/overview?days=30
GET   /v1/vendors/{{vendorId}}/analytics/timeseries?days=30
GET   /v1/vendors/{{vendorId}}/analytics/top-products?days=30&limit=10
```

Pages:

```txt
/users
/users/[userId]
/vendors
/vendors/[vendorId]
```

User list columns:

- Name
- Email
- Phone
- Account type
- Status
- Email verified
- Phone verified
- Created date
- Actions

Vendor list columns:

- Store name
- Legal name
- Store type
- Status
- Owner
- Phone
- Email
- City
- KYC status
- Created date
- Actions

Tasks:

- Implement users table with search, status filter, account type filter, and pagination.
- Implement suspend/reactivate user action with reason dialog.
- Implement role list and role assignment UI where the backend response supports it.
- Implement vendors table with search, status filter, store type filter, city filter, and pagination.
- Implement vendor detail with overview, members, analytics, and available KYC data.
- Implement approve/suspend/reject vendor status action.
- Add a vendor risk card using available data first and placeholders for missing signals.

Acceptance criteria:

- Admin can find users and vendors quickly.
- Admin can change user and vendor status.
- Role changes are visible after mutation.
- Vendor detail shows current status, owner information, members, and performance overview.

Backend gaps to schedule:

```txt
GET /v1/admin/users/{{userId}}
PATCH /v1/admin/users/{{userId}}
GET /v1/admin/users/{{userId}}/orders
GET /v1/admin/users/{{userId}}/vendors
GET /v1/admin/users/{{userId}}/reviews
GET /v1/admin/vendors/{{vendorId}}
PATCH /v1/admin/vendors/{{vendorId}}
POST /v1/admin/vendors/{{vendorId}}/note
```

### Phase 3 - KYC and Review Moderation

Goal: create operational queues for approval work.

Current backend endpoints:

```txt
GET   /v1/vendors/{{vendorId}}/verifications
POST  /v1/vendors/{{vendorId}}/verifications
PATCH /v1/vendors/{{vendorId}}/verifications/1
GET   /v1/files/{{filePublicId}}
POST  /v1/files/upload?purpose=VENDOR_KYC

GET  /v1/admin/reviews?status=PENDING&limit=20
POST /v1/admin/reviews/{{reviewId}}/moderate
GET  /v1/products/{{productPublicId}}/reviews?limit=20
GET  /v1/products/{{productPublicId}}/reviews/summary
POST /v1/vendors/{{vendorId}}/reviews/{{reviewId}}/reply
```

Pages:

```txt
/verifications
/verifications/[verificationId]
/reviews
/reviews/[reviewId]
```

Tasks:

- Build reviews queue with tabs: pending, approved, rejected, reported, all.
- Build review moderation action with approve/reject and required reason for rejection.
- Build vendor-scoped KYC review inside vendor detail using current APIs.
- Build placeholder global KYC queue page that explains backend dependency and can be wired once endpoints exist.
- Implement document preview component for files.
- Log and surface action results through audit log panels where available.

Acceptance criteria:

- Admin can moderate pending reviews.
- Admin must provide a rejection reason when rejecting review or KYC.
- Vendor-scoped verification review works from vendor detail.
- Global KYC queue is ready behind a backend endpoint flag.

Backend gaps to schedule:

```txt
GET   /v1/admin/verifications?status=PENDING&documentType=NATIONAL_ID
GET   /v1/admin/verifications/{{verificationId}}
PATCH /v1/admin/verifications/{{verificationId}}/review
POST  /v1/admin/verifications/{{verificationId}}/request-resubmission
GET   /v1/admin/user-verifications?status=PENDING
GET   /v1/admin/user-verifications/{{verificationId}}
PATCH /v1/admin/user-verifications/{{verificationId}}/review
GET   /v1/admin/reviews/{{reviewId}}
POST  /v1/admin/reviews/{{reviewId}}/hide
POST  /v1/admin/reviews/{{reviewId}}/restore
DELETE /v1/admin/reviews/{{reviewId}}
```

### Phase 4 - Orders, Bulk Orders, Payments, and Refunds

Goal: let admins inspect orders and handle finance support workflows.

Current backend endpoints:

```txt
GET  /v1/admin/orders?limit=20
GET  /v1/admin/orders/{{orderId}}
GET  /v1/orders/{{orderId}}
POST /v1/orders/{{orderId}}/cancel
GET  /v1/orders/{{orderId}}/payments
GET  /v1/vendors/{{vendorId}}/order-splits?limit=20
GET  /v1/vendors/{{vendorId}}/order-splits/{{splitId}}
PATCH /v1/vendors/{{vendorId}}/order-splits/{{splitId}}/status
PATCH /v1/vendors/{{vendorId}}/order-splits/{{splitId}}/fulfillment

GET  /v1/bulk/orders?limit=20
GET  /v1/bulk/orders/{{bulkOrderId}}
GET  /v1/vendors/{{supplierVendorId}}/bulk-orders?limit=20
GET  /v1/vendors/{{supplierVendorId}}/bulk-orders/{{bulkOrderId}}
PATCH /v1/vendors/{{supplierVendorId}}/bulk-orders/{{bulkOrderId}}/status
PATCH /v1/vendors/{{supplierVendorId}}/bulk-orders/{{bulkOrderId}}/fulfillment

GET  /v1/admin/payments?limit=20
GET  /v1/payments/{{paymentId}}
GET  /v1/orders/{{orderId}}/payments
POST /v1/admin/payments/{{paymentId}}/refund
```

Pages:

```txt
/orders
/orders/[orderId]
/bulk-orders
/bulk-orders/[bulkOrderId]
/payments
/payments/[paymentId]
/refunds
/refunds/[refundId]
```

Tasks:

- Build orders table with status, payment status, date range, customer, vendor, and search filters.
- Build order detail with overview, items, payments, vendor splits, customer, timeline placeholder, and audit log.
- Build bulk order list and detail as read-first views.
- Build payments list with status, gateway, method, amount range, date range, and order filters.
- Build refund action from payment detail with reason and amount validation.
- Build refunds pages as backend-gap placeholders until refund listing exists.
- Avoid using vendor-scoped mutation endpoints for admin actions unless product decides it is acceptable for MVP.

Acceptance criteria:

- Admin can inspect any order exposed by `/v1/admin/orders`.
- Admin can inspect order payments.
- Admin can refund a payment through the admin refund endpoint.
- Bulk order pages clearly show which actions require backend admin endpoints.

Backend gaps to schedule:

```txt
PATCH /v1/admin/orders/{{orderId}}/status
POST  /v1/admin/orders/{{orderId}}/cancel
POST  /v1/admin/orders/{{orderId}}/notes
GET   /v1/admin/orders/{{orderId}}/events
PATCH /v1/admin/order-splits/{{splitId}}/status
PATCH /v1/admin/order-splits/{{splitId}}/fulfillment

GET   /v1/admin/bulk-orders
GET   /v1/admin/bulk-orders/{{bulkOrderId}}
PATCH /v1/admin/bulk-orders/{{bulkOrderId}}/status
PATCH /v1/admin/bulk-orders/{{bulkOrderId}}/fulfillment
POST  /v1/admin/bulk-orders/{{bulkOrderId}}/notes

GET  /v1/admin/refunds
GET  /v1/admin/refunds/{{refundId}}
POST /v1/admin/refunds/{{refundId}}/approve
POST /v1/admin/refunds/{{refundId}}/reject
```

### Phase 5 - Catalog, Products, and Inventory

Goal: manage taxonomy and inspect product quality.

Current backend endpoints:

```txt
GET    /v1/products?limit=20&locale=ar
GET    /v1/products/{{productPublicId}}
GET    /v1/vendors/{{vendorId}}/products/manage?limit=20
GET    /v1/vendors/{{vendorId}}/products/dashboard?days=30&limit=4
POST   /v1/vendors/{{vendorId}}/products
PATCH  /v1/vendors/{{vendorId}}/products/{{productPublicId}}
DELETE /v1/vendors/{{vendorId}}/products/{{productPublicId}}
POST   /v1/vendors/{{vendorId}}/products/{{productPublicId}}/variants
PATCH  /v1/vendors/{{vendorId}}/products/{{productPublicId}}/variants/{{variantId}}
DELETE /v1/vendors/{{vendorId}}/products/{{productPublicId}}/variants/{{variantId}}
POST   /v1/vendors/{{vendorId}}/products/{{productPublicId}}/images
DELETE /v1/vendors/{{vendorId}}/products/{{productPublicId}}/images/1
GET    /v1/vendors/{{vendorId}}/inventory?limit=20&lowStockOnly=false
PATCH  /v1/vendors/{{vendorId}}/inventory/1
POST   /v1/vendors/{{vendorId}}/inventory/restock

GET    /v1/categories
GET    /v1/categories/{{categoryPublicId}}
GET    /v1/categories/{{categoryPublicId}}/attributes
POST   /v1/categories
PATCH  /v1/categories/{{categoryPublicId}}
DELETE /v1/categories/{{categoryPublicId}}
POST   /v1/categories/{{categoryPublicId}}/image
POST   /v1/categories/{{categoryPublicId}}/attributes
PATCH  /v1/categories/{{categoryPublicId}}/attributes/{{categoryAttributeId}}
DELETE /v1/categories/{{categoryPublicId}}/attributes/{{categoryAttributeId}}

GET    /v1/brands?limit=20
GET    /v1/brands/{{brandPublicId}}
POST   /v1/brands
PATCH  /v1/brands/{{brandPublicId}}
DELETE /v1/brands/{{brandPublicId}}

GET    /v1/store-categories
GET    /v1/store-categories/{{storeCategoryId}}
POST   /v1/store-categories
PATCH  /v1/store-categories/{{storeCategoryId}}
DELETE /v1/store-categories/{{storeCategoryId}}
```

Pages:

```txt
/products
/products/[productPublicId]
/catalog/categories
/catalog/categories/[categoryPublicId]
/catalog/brands
/catalog/store-categories
/catalog/attributes
```

Tasks:

- Build categories tree manager with create, update, delete, image upload, and active state.
- Build category attributes manager.
- Build brands table and forms.
- Build store categories table and forms.
- Build products list using public product endpoint first.
- Build product detail with overview, images, variants, inventory, reviews, and audit placeholder.
- Build low stock inventory views from vendor inventory once a vendor is selected.
- Keep product moderation actions behind backend-gap flags.

Acceptance criteria:

- Admin can create/update/delete categories.
- Admin can create/update/delete category attributes.
- Admin can create/update/delete brands.
- Admin can create/update/delete store categories.
- Admin can inspect products and identify low-stock items where vendor inventory is available.

Backend gaps to schedule:

```txt
GET   /v1/admin/products?status=&vendorId=&categoryId=&q=
GET   /v1/admin/products/{{productPublicId}}
POST  /v1/admin/products/{{productPublicId}}/moderate
PATCH /v1/admin/products/{{productPublicId}}/status
POST  /v1/admin/products/{{productPublicId}}/feature
POST  /v1/admin/products/{{productPublicId}}/unfeature
```

### Phase 6 - Marketing, Shipping, Settings, Billing, Audit, and Ops

Goal: finish the admin MVP with operational configuration and monitoring.

Current backend endpoints:

```txt
GET    /v1/admin/promotions?limit=20&status=ACTIVE
GET    /v1/admin/promotions/{{promotionId}}
POST   /v1/admin/promotions
PATCH  /v1/admin/promotions/{{promotionId}}
DELETE /v1/admin/promotions/{{promotionId}}
POST   /v1/promotions/validate

GET    /v1/admin/banners?position=HOME_HERO
GET    /v1/admin/banners/{{bannerId}}
POST   /v1/admin/banners
PATCH  /v1/admin/banners/{{bannerId}}
DELETE /v1/admin/banners/{{bannerId}}
POST   /v1/files/upload?purpose=BANNER_IMAGE

GET    /v1/shipping/zones
GET    /v1/shipping/methods
POST   /v1/shipping/quote
POST   /v1/shipping/admin/zones
PATCH  /v1/shipping/admin/zones/{{shippingZoneId}}
DELETE /v1/shipping/admin/zones/{{shippingZoneId}}
POST   /v1/shipping/admin/methods
PATCH  /v1/shipping/admin/methods/{{shippingMethodId}}
DELETE /v1/shipping/admin/methods/{{shippingMethodId}}
GET    /v1/vendors/{{vendorId}}/shipping-rates
POST   /v1/vendors/{{vendorId}}/shipping-rates
DELETE /v1/vendors/{{vendorId}}/shipping-rates/{{shippingRateId}}

GET   /v1/admin/settings
PATCH /v1/admin/settings

GET   /v1/vendors/{{vendorId}}/billing/summary
GET   /v1/vendors/{{vendorId}}/billing/invoices/{{vendorBillingInvoiceId}}
GET   /v1/vendors/{{vendorId}}/billing/transactions?limit=20
PATCH /v1/admin/vendor-billing/payments/{{vendorBillingPaymentId}}/review
POST  /v1/admin/vendor-billing/run

GET /v1/admin/audit-logs?limit=20
GET /health
GET /health/ready
GET /metrics
GET /docs/json
GET /docs/yaml
GET /v1/admin/ops/queues
```

Pages:

```txt
/promotions
/promotions/create
/promotions/[promotionId]
/banners
/banners/create
/banners/[bannerId]
/shipping/zones
/shipping/methods
/shipping/vendor-rates
/shipping/quote-tester
/settings
/billing/overview
/billing/vendors
/billing/invoices
/billing/payments
/billing/jobs
/audit-logs
/ops/health
/ops/queues
```

Tasks:

- Build promotions CRUD with validation preview.
- Build banners CRUD with file upload.
- Build shipping zones, methods, vendor rates, and quote tester.
- Build grouped settings editor with change review before save.
- Build vendor billing overview from available vendor-scoped data and admin billing actions.
- Build billing payment review and run billing job dialogs.
- Build audit log list with filters where supported.
- Build ops health and queue status pages.

Acceptance criteria:

- Admin can create and update promotions.
- Admin can create and update banners.
- Admin can configure shipping zones and methods.
- Admin can update settings with confirmation.
- Admin can review billing payments and run billing job.
- Admin can view audit logs and queue health.

Backend gaps to schedule:

```txt
GET  /v1/admin/vendor-billing/accounts
GET  /v1/admin/vendor-billing/invoices
GET  /v1/admin/vendor-billing/invoices/{{invoiceId}}
GET  /v1/admin/vendor-billing/payments
GET  /v1/admin/vendor-billing/ledger
POST /v1/admin/vendor-billing/invoices/{{invoiceId}}/mark-paid
POST /v1/admin/vendor-billing/invoices/{{invoiceId}}/void

GET   /v1/admin/payout-accounts?status=PENDING
GET   /v1/admin/payout-accounts/{{payoutAccountId}}
PATCH /v1/admin/payout-accounts/{{payoutAccountId}}/review
GET   /v1/admin/payouts
GET   /v1/admin/payouts/{{payoutId}}
POST  /v1/admin/payouts/{{payoutId}}/mark-paid
POST  /v1/admin/payouts/{{payoutId}}/mark-failed

GET  /v1/admin/audit-logs/{{auditLogId}}
GET  /v1/admin/audit-logs/export
GET  /v1/admin/ops/webhooks
GET  /v1/admin/ops/webhooks/{{webhookEventId}}
POST /v1/admin/ops/webhooks/{{webhookEventId}}/retry
GET  /v1/admin/ops/jobs
POST /v1/admin/ops/jobs/{{jobName}}/run
```

## Backend Contract Backlog

### P0 - Required for a complete operational MVP

- Global KYC queue:
  - `GET /v1/admin/verifications`
  - `GET /v1/admin/verifications/{{verificationId}}`
  - `PATCH /v1/admin/verifications/{{verificationId}}/review`
- Admin user detail:
  - `GET /v1/admin/users/{{userId}}`
  - `PATCH /v1/admin/users/{{userId}}`
- Admin vendor detail:
  - `GET /v1/admin/vendors/{{vendorId}}`
  - `PATCH /v1/admin/vendors/{{vendorId}}`
- Admin product moderation:
  - `GET /v1/admin/products`
  - `GET /v1/admin/products/{{productPublicId}}`
  - `POST /v1/admin/products/{{productPublicId}}/moderate`
  - `PATCH /v1/admin/products/{{productPublicId}}/status`
- Admin order actions:
  - `PATCH /v1/admin/orders/{{orderId}}/status`
  - `POST /v1/admin/orders/{{orderId}}/cancel`
  - `GET /v1/admin/orders/{{orderId}}/events`
- Refund listing:
  - `GET /v1/admin/refunds`
  - `GET /v1/admin/refunds/{{refundId}}`

### P1 - Important for finance and support

- Global vendor billing accounts, invoices, payments, and ledger.
- Payout account review and payout transaction management.
- Internal notes for users, vendors, orders, payments, KYC, and products.
- Admin review detail, hide, restore, and delete.
- Admin bulk order list, detail, status, fulfillment, and notes.

### P2 - Operational maturity

- Admin notification broadcasts and campaigns.
- Admin file browser and signed URL endpoint.
- Webhook event browser and retry action.
- Job browser and manual job run action.
- Audit log detail and export.

## Testing Strategy

### Unit and component tests

- Test formatters, permission helpers, query key builders, and status mappings.
- Test form schemas with valid and invalid payloads.
- Test table filter state and pagination behavior.
- Use MSW to mock backend envelopes and error responses.

### End-to-end tests

Use Playwright for:

- Login success and failure.
- Protected route redirect.
- Dashboard loads and links to queues.
- Users table filtering and status mutation.
- Vendors table filtering and status mutation.
- Review moderation.
- Promotion create/update.
- Banner create/update with mocked upload.

### Manual QA checklist

- No admin token appears in browser local storage, session storage, or readable JavaScript state.
- All actions show loading, success, and error feedback.
- All dangerous actions require confirmation and reason where applicable.
- Empty states explain the next useful action.
- Tables preserve filters when navigating back from detail pages.
- Sidebar and tables work on laptop and tablet widths.
- API errors preserve backend `code`, `message`, and `details`.

## Validation Commands

Run before declaring each implementation slice complete:

```bash
cd /Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewAdmin
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

When backend contract changes are part of a slice, also run the backend validation gate:

```bash
cd /Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewBackendV2
npm run lint
npm test
```

## First Two Sprints

### Sprint 1

- Scaffold app.
- Implement auth proxy and cookies.
- Implement protected admin shell.
- Implement generated API types workflow.
- Implement `CursorDataTable`.
- Build dashboard with analytics, queues, and audit logs.

Deliverable: an admin can log in and see a live dashboard.

### Sprint 2

- Build users list and user status actions.
- Build roles list and assignment UI.
- Build vendors list and vendor status actions.
- Build vendor detail overview.
- Build review moderation queue.

Deliverable: an admin can handle the first real operational workflows: users, vendors, and reviews.

## Definition of Done

A module is done when:

- It uses backend routes through the Next.js proxy.
- It has loading, empty, error, and success states.
- It supports pagination and filtering for list views.
- It validates forms with Zod.
- It uses permission gates for sensitive actions.
- Mutations invalidate relevant queries.
- It records or displays audit activity when the backend supports it.
- It has Playwright or MSW coverage for the primary workflow.
- `lint`, `typecheck`, and `build` pass.

## Recommended Build Order

1. Scaffold, auth, RBAC, API proxy, admin shell.
2. Dashboard and reusable table system.
3. Users and roles.
4. Vendors and vendor detail.
5. Reviews queue.
6. Vendor-scoped KYC, then global KYC once backend endpoints exist.
7. Orders and payments.
8. Catalog and products.
9. Promotions and banners.
10. Shipping, settings, billing, audit logs, and ops.

The admin panel should be built as an action center. The first screen should tell staff what needs review, what needs money handling, what needs moderation, and what system area needs attention.
