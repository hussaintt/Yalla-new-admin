# Production Readiness Audit & Upgrade Plan - Yalla New Admin Panel

This plan outlines the gaps, issues, and specific implementation tasks required to transition the current prototype of the Yalla New Admin Panel into a robust, secure, and fully verified production-ready application.

---

## 1. Executive Summary

The `YallaNewAdmin` panel is structured as a Next.js 16 App Router BFF (Backend-for-Frontend) application. The frontend uses React 19, React Query 5, Tailwind CSS 4, and shadcn/ui. 

An extensive audit of the codebase reveals that:
1. **Routing and Page Structure:** All operational sub-areas exist in the routing table, but many are stubs that import generic list pages (`admin-resource-pages.tsx`) or detail stubs (`remaining-admin-pages.tsx`) containing "Backend Gap Cards" due to missing API endpoints.
2. **Missing Sidebar Page:** The `/notifications` route is completely missing from the filesystem (`src/app/(admin)/notifications`), leading to a 404 error if clicked from the sidebar.
3. **Hardcoded Metrics & Badges:** The sidebar page counts (e.g. Products, Orders) and warning badges (e.g. KYC, Notifications) are static hardcoded values.
4. **Mutations Without Reasons:** The status mutations on the Users page and the main Vendors list do not prompt for, or forward, audit reasons to the backend, bypassing auditing compliance.
5. **Basic Dialogs:** Native browser popups (`window.confirm`, `window.prompt`) are used on several catalog, shipping, user detail, and refund paths instead of the premium `ActionDialog` wrapper.
6. **Inefficient Category/Brand Import:** The catalog page includes a bulk import feature from a client-side JSON file (`noon_categories_and_brands.json`) that triggers single POST API calls in a loop.

---

## 2. Page-by-Page Audit & Gaps Map

Below is a detailed audit of every operational screen in the admin shell, outlining its current data source, functional status, user controls, and identified issues.

### Core Operations

| Route Path | Page Component | Data Source | Gaps & Production Issues | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `src/app/(auth)/login` | `POST /api/auth/login` | None. Fully functional with strict security cookies (`yalla_admin_session`, `yalla_admin_refresh`). | — |
| `/dashboard` | `DashboardPage` | `/api/admin/admin/analytics/...` | 1. **Broken Link:** The "تصدير تقرير" (Export Report) button links to `/reports`, which does not exist.<br>2. **Mock Interaction:** The BullMQ queue download button is a static UI component with no download functionality. | P1 |
| `/users` | `UsersPage` | `/api/admin/admin/users`<br>`/api/admin/roles` | 1. **Audit Gap:** Suspending a user triggers the `ActionDialog`, but the reason input is **not** passed to the mutation payload.<br>2. **Forms Validation:** The role creation form is a basic input form without validation schemas. | P1 |
| `/users/[userId]` | `UserDetailPage` | `/api/admin/admin/users/:userId` | 1. **Basic UX:** Account suspension uses native `window.confirm` instead of `ActionDialog`.<br>2. **No Audit Reason:** Suspension does not capture a reason. | P2 |
| `/users/create` | `CreateAdminUserPage` | `POST /api/admin/admin/users` | None. Form uses `react-hook-form` + `zod` validation and handles errors cleanly. | — |
| `/vendors` | `VendorsPage` | `/api/admin/admin/vendors` | 1. **Audit Gap:** Suspending a vendor from the list page does not capture or submit a suspension reason. | P1 |
| `/vendors/[vendorId]` | `VendorDetailPage` | `/api/admin/admin/vendors/:vendorId` | None. Detail view is fully functional, handles status changes (approved, suspended, rejected) with reasons correctly, and reviews KYC documents inline. | — |
| `/verifications` | `VerificationsPage` | `/api/admin/admin/verifications` | 1. **Missing Backend:** The backend API `GET /v1/admin/verifications` is not yet implemented (P0 gap). | P0 |

### Commerce & Catalog

| Route Path | Page Component | Data Source | Gaps & Production Issues | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `/products` | `ProductsPage` | `/api/admin/products` | 1. Uses the public product listing endpoint rather than an administrative catalog queue. | P2 |
| `/products/[productId]` | `ProductDetailPage` | `/api/admin/products/:productId` | 1. **Missing Backend:** The status mutations (Active, Archived, Draft) call `/api/admin/admin/products/:productId/status` which is unimplemented.<br>2. **Conditional Failures:** The availability call `/v1/products/:id/availability` fails with a 404 for non-active products, triggering a gap card. | P0 |
| `/catalog` | `CatalogPage` | `/api/admin/categories`<br>`/api/admin/brands` | 1. **Inefficient Loop:** "استيراد بيانات Noon" loops client-side and triggers one POST request per category/brand. This is slow and prone to partial failure.<br>2. **Basic Forms:** Category creation forms are basic, bypassing hook-form validation. | P1 |
| `/catalog/categories/[categoryId]` | `CategoryDetailPage` | `/api/admin/categories/:id` | 1. **Basic UX:** Deleting a category uses `window.confirm` instead of the styled `ActionDialog`. | P2 |
| `/catalog/brands` | `CatalogBrandsPage` | `/api/admin/brands` | 1. Add forms are basic. Delete action uses `window.confirm`. | P2 |
| `/catalog/store-categories` | `CatalogStoreCategoriesPage` | `/api/admin/store-categories` | 1. Add forms are basic. Delete action uses `window.confirm`. | P2 |
| `/orders` | `OrdersPage` | `/api/admin/admin/orders` | None. List page is functional with status filtering. | — |
| `/orders/[orderId]` | `OrderDetailPage` | `/api/admin/admin/orders/:id` | 1. **Missing Backend:** Operational order cancel (`POST /v1/admin/orders/:id/cancel`) and manual status corrections are missing. Displays a gap card. | P0 |
| `/bulk-orders` | `BulkOrdersPage` | `/api/admin/bulk/orders` | 1. **Missing Backend:** Uses client-side buyer API (`/v1/bulk/orders`). Admin B2B queue (`GET /v1/admin/bulk-orders`) is missing. | P1 |
| `/bulk-orders/[bulkOrderId]` | `BulkOrderDetailPage` | `/api/admin/bulk/orders/:id` | 1. **Missing Backend:** Status mutations, fulfillments, and admin comments are missing backend support. | P1 |
| `/promotions` | `PromotionsPage` | `/api/admin/admin/promotions` | 1. Add forms are basic. Delete action uses `window.confirm`. | P2 |
| `/promotions/[promotionId]` | `PromotionDetailPage` | `/api/admin/admin/promotions/:id` | 1. Basic editor without zod validation. Delete uses `window.confirm`. | P2 |

### Finance & Billing

| Route Path | Page Component | Data Source | Gaps & Production Issues | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `/billing` | `BillingPage` | `/api/admin/admin/vendor-billing/...` | 1. **Missing Backend:** Billing cycle control works, but sub-tabs (`/billing/overview`, `/billing/invoices`, etc.) show stubs because global invoicing lists are not yet implemented. | P1 |
| `/payments` | `PaymentsPage` | `/api/admin/admin/payments` | 1. **Basic UX:** The refund trigger uses `window.prompt` to capture the amount and reason instead of the premium `ActionDialog`. | P1 |
| `/payments/[paymentId]` | `PaymentDetailPage` | `/api/admin/payments/:id` | 1. **Basic UX:** Payout refund uses `window.prompt` for amount/reason. | P1 |
| `/refunds` | `RefundsPage` | `/api/admin/admin/refunds` | 1. **Missing Backend:** Global refunds list queue is not implemented in the backend (P0 gap). | P0 |
| `/refunds/[refundId]` | `RefundDetailPage` | — | 1. **Missing Route:** Stub page displays gap card. No backend detail endpoint exists. | P0 |
| `/shipping` | `ShippingPage` | `/api/admin/shipping/...` | None. Main dashboard config works. | — |
| `/shipping/zones` / `methods` | `ShippingEntityPage` | `/api/admin/shipping/...` | 1. **Basic UX:** Deleting zones or methods uses `window.confirm`. | P2 |
| `/shipping/vendor-rates` | `ShippingVendorRatesPage` | `/api/admin/vendors/:id/...` | 1. **Manual Entry:** Requires entering the vendor ID manually in a text field rather than choosing from a select or search dropdown. | P2 |
| `/subscriptions` | `SubscriptionsPage` | `/api/admin/admin/subscriptions/...` | None. Fully functional. | — |

### System & Ops

| Route Path | Page Component | Data Source | Gaps & Production Issues | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `/notifications` | **Missing Page** | — | **404 Error:** No route exists under `src/app/(admin)/notifications`. Sidebar link fails. | P0 |
| `/media` | `MediaPage` | `/api/admin/admin/media/...` | None. Fully functional. | — |
| `/settings` | `SettingsPage` | `/api/admin/admin/settings` | None. Config list and updates are fully functional. | — |
| `/audit-logs` | `AuditLogsPage` | `/api/admin/admin/audit-logs` | None. Fully functional with `AuditLogDiffSection`. | — |
| `/audit-logs/export` | `AuditExportPage` | — | 1. **Missing Backend:** CSV audit trail export (`GET /v1/admin/audit-logs/export`) is unimplemented. | P2 |
| `/ops/health` | `OpsHealthPage` | `/api/system/health` | None. Functional diagnoses. | — |
| `/ops/queues` | `OpsQueuesPage` | `/api/admin/admin/ops/queues` | None. Functional. | — |
| `/ops/jobs` / `webhooks` | `OpsGapPage` | — | 1. **Missing Backend:** BullMQ job triggering and webhook logs are missing backend support. | P2 |

---

## 3. Detailed Gaps & Missing Backend APIs

The following endpoints must be added to the backend API `YallaNewBackendV2` to make all admin features fully functional:

1. **KYC & Verification global list:**
   * `GET /v1/admin/verifications?status=PENDING&limit=20&cursor=`
   * `PATCH /v1/admin/verifications/:id/review` (Approves/rejects with a reason payload)
2. **Order administrative actions:**
   * `PATCH /v1/admin/orders/:orderId/status` (Manual override of orders)
   * `POST /v1/admin/orders/:orderId/cancel` (With body: `{ reason }`)
   * `GET /v1/admin/orders/:orderId/events` (Audit timeline)
3. **Global Bulk Orders:**
   * `GET /v1/admin/bulk-orders` (Admin list)
   * `PATCH /v1/admin/bulk-orders/:id/status` (Update status)
4. **Refunds Queue:**
   * `GET /v1/admin/refunds` (Admin list)
   * `GET /v1/admin/refunds/:id` (Detail view)
5. **Global Billing Lists:**
   * `GET /v1/admin/vendor-billing/accounts` (All ledgers)
   * `GET /v1/admin/vendor-billing/invoices` (All invoices)
6. **Audit Export:**
   * `GET /v1/admin/audit-logs/export` (Triggers CSV stream download)

---

## 4. Proposed Upgrade Tasks (Action Items)

To turn this prototype into a production app, the following steps must be completed.

### Task 1: Route Fixes & Hardcoded Counts
* Create the missing `/notifications` route folder (`src/app/(admin)/notifications/page.tsx`) mapping to a notification broadcast screen.
* Implement a `GET /api/admin/admin/counts` endpoint in the BFF Next.js layer that calls a new backend statistics route.
* Update `src/components/layout/admin-shell.tsx` to fetch the counts via React Query, replacement of hardcoded count badges with live statistics.

### Task 2: Core Form Hardening & Audit Reasons
* Add the missing `reason` parameter to the `updateStatus` mutation on `/users` (`src/features/users/users-page.tsx`).
* Add the missing `reason` parameter to the `updateStatus` mutation on `/vendors` list (`src/features/vendors/vendors-page.tsx`) and configure `ActionDialog` to prompt for it.
* Replace native browser popups (`window.confirm`, `window.prompt`) on the catalog delete actions, payment refund prompts, and category deletes with the shadcn `ActionDialog`.

### Task 3: API Integration and Gap Resolution
* Coordinate with the backend team to deploy the missing endpoints (KYC lists, refund lists, billing lists, order cancellations, audit exports).
* Replace the local loops for category/brand imports in `src/features/resources/admin-resource-pages.tsx` with a single bulk import endpoint.

---

## 5. Verification Plan

After executing the upgrade tasks, verification will consist of:

1. **Lint and Type Safety:**
   * Run `npm run lint` and `npm run typecheck` to confirm zero static compiler issues.
2. **Production Build:**
   * Run `npm run build` to confirm compilation is successful under Next.js server-side optimizations.
3. **E2E Playwright Tests:**
   * Write and execute Playwright tests in `tests/e2e/` checking vendor approvals, KYC review decisions, user role updates, and refund submissions.
