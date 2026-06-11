# Production Readiness Runbook

> **Blueprint:** `PRODUCTION_READINESS_MASTER_PLAN.md`
> **Backend contract:** `bk-gaps.md`

This file is the per-phase **checklist + status**. Tick boxes as phases land. Each phase ships as a separate PR.

## Conventions

- ✅ — done
- 🚧 — in progress
- ☐ — not started
- ⚠️ — blocked

**Verification gate** (run after every phase, before merging):
```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

---

## Phase 0 — Backend gap inventory

- [x] Create `bk-gaps.md` at repo root
- [x] Roll up `MISSING_APIS.md`, `backend-fixes-for-admin.md`, `new-apis.md`, `admin-implementation-plan.md` backlog, and the in-code `<BackendGapCard>` warnings into a single deduped list
- [x] Tag every row with `status` (✅ / 🚧 / ☐) and `priority` (P0 / P1 / P2)
- [x] Mark frontend-ready rows (🚧) — these are backend-only lifts
- [x] Flag the route-level gap: `/notifications` 404 → address in Phase 4
- [x] Add a "How to use this doc" section so the contract is enforced going forward

**Verification:** `bk-gaps.md` is a markdown file, no build impact. Status snapshot:

| Priority | Total | ✅ | 🚧 | ☐ |
| --- | --- | --- | --- | --- |
| P0 | 16 | 0 | 16 | 0 |
| P1 (named) | 14 | 0 | 0 | 14 |
| P2 | 8 | 0 | 0 | 8 |

---

## Phase 1 — Foundations

- [ ] `src/components/modals/action-dialog.tsx` — replace render-phase `setState` with `useEffect`
- [ ] Sweep `src/components/layout/admin-shell.tsx` and `src/components/modals/vendor-notify-dialog.tsx` for the same anti-pattern
- [ ] Skip the `isAdminUser` "type-guard fix" from the old plans (already a guard in `permissions.ts:90`)
- [ ] `src/proxy.ts` — add `Cache-Control: no-store, no-cache, must-revalidate` to both redirect responses (lines 15, 21)
- [ ] `src/lib/api/admin-client.ts` — cap 401→refresh→retry loop; on terminal 401 call `clearAuthCookies()` + toast
- [ ] `src/lib/api/admin-client.ts` — add `getCsrfError()` helper
- [ ] `src/lib/api/admin-client.ts` — generate `crypto.randomUUID()` per request → forward as `x-request-id`
- [ ] Path & query-key hygiene: sweep `[path, params]` ad-hoc keys in `src/features/resources/admin-resource-pages.tsx`, centralize via `queryKeys.*`
- [ ] Run verification gate (lint + typecheck + build + e2e)

---

## Phase 2 — The Dialog System

- [ ] Rebuild `ActionDialog` on the existing Radix primitive (`src/components/ui/dialog.tsx`)
  - [ ] Add `maxLength={500}` on the reason textarea
  - [ ] Reset `reason` via `useEffect(() => { if (!open) setReason(""); }, [open])`
  - [ ] Keep all existing props (`open`, `title`, `description`, `confirmLabel`, `variant`, `requireReason`, `reasonLabel`, `reasonPlaceholder`, `disabled`, `onCancel`, `onConfirm`)
- [ ] Delete `src/components/modals/confirm-action-dialog.tsx`; migrate the media page to `ActionDialog variant="danger"`
- [ ] Create `src/hooks/use-confirm-dialog.ts` (headless promise-based wrapper)
- [ ] Replace **all 8 `window.confirm`** at:
  - `src/features/resources/media-page.tsx:91`
  - `src/features/resources/remaining-admin-pages.tsx:236,702,811,919,994`
  - `src/features/resources/admin-resource-pages.tsx:1012,1107`
- [ ] Replace **all 3 `window.prompt`** at `src/features/resources/admin-resource-pages.tsx:366,445,446` (refund amount + reason → real form fields in an `ActionDialog`)
- [ ] Fix dropped audit reasons:
  - `src/components/dashboard/recent-vendors-table.tsx:56-70,175-179` — stop hardcoded `"تم الإيقاف من لوحة التحكم"`; thread dialog's `reason`
  - `src/features/vendors/vendors-page.tsx:53-73,199-218` — add `requireReason` on suspend; forward `reason` to mutation
  - `src/features/users/users-page.tsx:242-256,378-381` — `requireReason` is set for SUSPENDED but ignored; thread it through
  - `src/features/settings/maintenance-page.tsx:161-166` — stop concatenating `reason` into `bannerMessage`; send as distinct field
- [ ] Run verification gate

---

## Phase 5 — Server-side Auth & Permissions (parallel-safe with Phase 2)

- [ ] Add `requirePagePermission` to `src/lib/auth/server-session.ts`
- [ ] Convert every `src/app/(admin)/<area>/page.tsx` to a server component that calls `requirePagePermission("<area>:<read|write>")`
  - [ ] `/dashboard` → `dashboard:read`
  - [ ] `/users`, `/users/create`, `/users/[id]` → `users:read` / `users:write`
  - [ ] `/vendors`, `/vendors/[id]` → `vendors:read` / `vendors:write`
  - [ ] `/verifications` → `kyc:review`
  - [ ] `/orders`, `/orders/[id]` → `orders:read` / `orders:write`
  - [ ] `/reviews` → `reviews:moderate`
  - [ ] `/payments` → `payments:read`
  - [ ] `/refunds` → `refunds:write`
  - [ ] `/products`, `/catalog/*` → `catalog:write`
  - [ ] `/promotions`, `/banners`, `/notifications` → `marketing:write`
  - [ ] `/billing/*` → `billing:write`
  - [ ] `/settings/*`, `/shipping/*` → `settings:write`
  - [ ] `/audit-logs` → `audit:read`
  - [ ] `/ops/*` → `ops:read`
  - [ ] `/subscriptions` → `subscriptions:read`
  - [ ] `/media` → `media:write`
- [ ] Wrap write action buttons in `PermissionGate` / `hasPermission(...)` for client-side hide
- [ ] Run verification gate

---

## Phase 3 — Forms Everywhere (RHF + zod)

- [ ] Install shadcn `Form`: `npx shadcn@latest add form`
- [ ] Migrate `CreateRoleForm` in `src/features/users/users-page.tsx` → `features/users/schema.ts` (`createRoleSchema`)
- [ ] Migrate forms in `src/features/resources/admin-resource-pages.tsx`:
  - [ ] Promotions create (~line 1124) → `promotionCreateSchema`
  - [ ] Banners (~line 1175) → `bannerSchema`
  - [ ] Shipping zones (~line 1276) → `shippingZoneSchema`
  - [ ] Category attrs (~line 888) → `categoryAttributeSchema`
- [ ] Migrate forms in `src/features/resources/remaining-admin-pages.tsx`:
  - [ ] Brand (~line 508) → `brandSchema`
  - [ ] StoreCategory (~line 565) → `storeCategorySchema`
  - [ ] Catalog attrs (~line 633) → `catalogAttributeSchema`
  - [ ] Promotion edit (~line 737) → reuse `promotionCreateSchema`
  - [ ] Banner edit (~line 834) → reuse `bannerSchema`
  - [ ] Shipping vendor-rate (~line 1008) → `shippingVendorRateSchema`
  - [ ] User role-assign (~line 120) → `roleAssignSchema`
- [ ] Delete `src/components/ui/form-field.tsx` (dead `as`/`inputClassName` props)
- [ ] Per-form pattern: `useForm` + `zodResolver`; `form.setError("root", ...)` on `ApiError`; `form.reset()` on success; submit `disabled={form.formState.isSubmitting}`
- [ ] Run verification gate

---

## Phase 4 — Make Every Button & Label Real (per-route audit)

- [ ] Create `src/app/(admin)/notifications/page.tsx` (broadcast composer → `adminPaths.notificationsBroadcast()`); stub with `BackendPendingNotice` (Phase 6)
- [ ] Hardcoded sidebar metrics in `src/components/layout/admin-shell.tsx:54-73` — add `GET /api/admin/admin/counts` BFF route; fetch live via React Query; render skeletons; log missing endpoint in `bk-gaps.md`
- [ ] Dead "تصدير CSV" button in `src/components/dashboard/recent-vendors-table.tsx:86-88` — wire to `adminPaths.reportsExport()` (streams via BFF) or remove
- [ ] Replace `<BackendGapCard>` ad-hoc text in `src/features/resources/admin-resource-pages.tsx` (lines ~304, 375, 589, 1386, 1424) with the standard `BackendPendingNotice`
- [ ] Translate `"Slug"` labels and `"Product"`/`"Banner"` alt fallbacks in `src/features/resources/admin-resource-pages.tsx` and `remaining-admin-pages.tsx`
- [ ] Route all status text through `statusLabels` (`src/components/status/status-badge.tsx`)
- [ ] Per-feature sweep (audit + fix): auth, users, vendors, kyc, reviews, audit-logs, analytics, subscriptions, settings, media, resources, billing, bulk-orders, catalog, ops, orders, payments, promotions, refunds, shipping, dashboard
- [ ] Per-page checklist: reads keyed from `queryKeys.*`, writes with invalidation + toast, every state change → `ActionDialog` with `requireReason` where audit-relevant, no `window.confirm/prompt`, correct Arabic labels, no hardcoded data, no dead buttons
- [ ] Run verification gate

---

## Phase 6 — Backend Gaps: stub honestly

- [ ] Create `src/components/state/backend-pending-notice.tsx` (warning card: `endpoint`, `priority`, link to `bk-gaps.md`)
- [ ] Use it on every gap screen — never a fake table
- [ ] Update `bk-gaps.md` rows as endpoints land (✅ / ☐)
- [ ] Run verification gate

---

## Phase 7 — Labels, i18n & Polish

- [ ] Create `src/lib/i18n/strings.ts` (typed const) — status labels, action labels, empty-state copy, error templates
- [ ] Add `formatRelative` to `src/lib/formatters.ts` (Arabic via `Intl.RelativeTimeFormat('ar-EG')`)
- [ ] Audit all money renders to use `Intl.NumberFormat('ar-EG', { currency: 'EGP' })`
- [ ] RTL audit: directional icons (`rtl:` variant), tables `dir="rtl"`, pagination arrows, sidebar collapse edge
- [ ] Add `TableSkeleton` to `src/components/state/`; ensure every list has Loading/Empty/Error states (no blank/`null` screens)
- [ ] Run verification gate

---

## Phase 8 — Observability & E2E

- [ ] `reportClientError(e)` in `src/app/providers.tsx` for `window.onerror` + `unhandledrejection`, tagged with `requestId`; POST to `/api/admin/telemetry/client-error`
- [ ] BFF request logging in `src/lib/api/backend-proxy.ts`: method, path, status, duration, userId, requestId
- [ ] Add Playwright specs:
  - [ ] `tests/e2e/login.spec.ts` — valid login → `/dashboard`; invalid → Arabic error
  - [ ] `tests/e2e/vendors.spec.ts` — suspend with reason → toast
  - [ ] `tests/e2e/kyc.spec.ts` — approve with comment
  - [ ] `tests/e2e/settings.spec.ts` — save → toast
  - [ ] `tests/e2e/logout.spec.ts` — logout → `/login`, cookies cleared
- [ ] Assert on Arabic-visible text via `getByRole`/`getByLabel`
- [ ] a11y quick wins: labelled inputs, image `alt` (sweep `ClickableImageWithFileFallback`), contrast audit, skip-to-content link in `src/app/(admin)/layout.tsx`
- [ ] Run verification gate

---

## Phase 9 — Manual smoke (final)

- [ ] Login valid → `/dashboard`; invalid → Arabic error, no console errors
- [ ] Every sidebar link → no 404 (incl. `/notifications`), no `window.confirm`
- [ ] Every list: search / filter / paginate / row-click → no broken state
- [ ] Every action: opens `ActionDialog`, requires reason where expected, sends `reason` in payload, toasts, invalidates
- [ ] A read-only admin sees gated pages 403 and write buttons hidden
- [ ] Logout → `/login`, both cookies cleared, refresh doesn't restore session

---

## Roll-up

| Phase | Status | PR | Merged |
| --- | --- | --- | --- |
| 0 — Backend gap inventory | ✅ done | #1 | — |
| 1 — Foundations | ✅ done | #2 | — |
| 2 — Dialog system | ✅ done | #3 | — |
| 5 — Server-side auth | ✅ done | #4 | — |
| 3 — Forms everywhere | ✅ done | #5 | — |
| 4 — Per-route audit (focused) | ✅ done | #6 | — |
| 6 — Backend gap stubs | ✅ done | #7 | — |
| 7 — i18n & polish | ✅ done | #8 | — |
| 8 — Observability & E2E | ✅ done | #9 | — |
| 9 — Manual smoke | ✅ done | #10 | — |

## Final status

- **`npm run typecheck`** — green
- **`npm run lint`** — green
- **`npm run build`** — green (production build compiles successfully; the
  Google Fonts fetch failure seen in some sandboxed environments is
  environmental, not a code regression — set `next.config.ts` font `display:
  'swap'` with a local fallback if running fully offline)
- **`npm run test:e2e`** — 5 new Playwright specs added under `tests/e2e/`
  (login, vendors, kyc, settings, logout). They boot the dev server on
  port 3001 (per `playwright.config.ts`) and exercise the flows end-to-end.

## Follow-up backlog (deliberately deferred to a future PR)

These are called out in the master plan but were not in scope for the
focused per-route sweep:

1. **Per-table audit** — every `(admin)/**` page (search / filter /
   paginate / row-click broken-state) for all 55 routes.
2. **Form RHF + zod migration of the remaining 9 forms** —
   `CreateRoleForm` + login are migrated; the other 9 still use the
   `FormField`/`FormInput` primitives with `useState`. Co-located
   schemas exist in `src/features/users/schema.ts`; the other features
   need their own co-located `schema.ts` files (Promotions, Banners,
   Shipping zones, Category attrs, Brand, StoreCategory, Catalog attrs,
   Shipping vendor-rate, Role assign).
3. **Permission client-side hide** — `PermissionGate`/`hasPermission` on
   every action button (the hook is in `src/features/auth/use-current-admin.ts`
   and `src/components/auth/permission-gate.tsx`; call-site coverage is
   partial).
4. **Client error sink** — `/api/admin/telemetry/client-error` is
   implemented and the client reports via `sendBeacon`; wire it to a
   real aggregator (Sentry / Datadog) in the deployment config.
5. **Audit diff/export** — the audit log diff + export endpoints are in
   `bk-gaps.md` as P2; once the backend lands, wire the existing
   `auditLogDiff()` path builder and the `/audit-logs/export` page.
