
# YallaNew Admin — Production Readiness Master Plan

## Context

`YallaNewAdmin` is a Next.js 16 (App Router) **BFF** admin panel for an Arabic, RTL e-commerce marketplace. Stack: React 19, React Query 5, Tailwind 4, shadcn/ui, react-hook-form + zod. It proxies to a separate backend repo (`YallaNewBackendV2`).

Today it is a **prototype that mostly renders**: the data/auth plumbing is genuinely good, but the UI layer has real production gaps — hardcoded metrics, a hand-rolled modal with an a11y/render bug, native `window.confirm/prompt` popups, audit reasons that get silently dropped, only one form using validation, no server-side permission gating, and ~38 backend endpoints that are missing or stubbed.

This plan turns it into a real production app where **every button works, every label is correct Arabic, every read comes from the backend, every mutation goes through a proper dialog (with an audit reason where it matters), and every page is permission-gated server-side**. Backend gaps are not faked — they are documented in `bk-gaps.md` and rendered as an honest "pending backend" state until the API lands.

This plan synthesizes two prior drafts (Gemini's per-route audit + MiniMax's phased architecture) and corrects both against a file-and-line-level audit of the actual code.

### Decisions locked in (from clarifying questions)
1. **Server-side per-page permission gating** — yes, added as a core phase (defense-in-depth).
2. **Scope** — functional + polish (centralized i18n, RTL/state audit, observability, E2E).
3. **Backend** — document in `bk-gaps.md` + stub the UI only; no backend code in this plan.

---

## Guiding Principles
1. **Backend is the source of truth.** If a value isn't in an API response, we don't fabricate it. Delete every hardcoded metric.
2. **One dialog strategy.** A single Radix-based `ActionDialog` for every state change (`requireReason` for audit-relevant mutations). No `window.confirm` / `window.prompt` anywhere.
3. **One form strategy.** `react-hook-form` + `zod` + `zodResolver`, schema co-located in `features/<domain>/schema.ts`. (Matches `AGENTS.md` §7.)
4. **Server-side gate, client-side hide.** Pages enforce permissions on the server; UI also hides what the user can't do.
5. **RTL + Arabic first.** New strings in Arabic; technical identifiers stay English. Money via `Intl.NumberFormat('ar-EG', { currency: 'EGP' })` through `src/lib/formatters.ts`.
6. **Track it.** A `PRODUCTION_READINESS.md` checklist is the runbook; this file is the blueprint.

### Reuse — already-built utilities to lean on (do not reinvent)
- `adminApi<T>()` — `src/lib/api/admin-client.ts` (handles 401→refresh→retry once).
- `adminPaths.*` — `src/lib/api/paths.ts` (typed route builders; many gap endpoints already declared here).
- `queryKeys.*` — `src/lib/api/query-keys.ts` (React Query key factory).
- `ApiError` / `normalizeApiError` — `src/lib/api/errors.ts`.
- `proxyAdminRequest` — `src/lib/api/backend-proxy.ts` (CSRF + Bearer + refresh).
- `resolveAdminSession()` — `src/lib/auth/server-session.ts` (returns `{ ok: true, user, accessToken, nextTokens? } | { ok: false, status, payload, clearAuth? }`).
- `hasPermission` / `permissionsForUser` / `isAdminUser` (already a type guard) — `src/lib/auth/permissions.ts`.
- `useCurrentAdmin()` — `src/features/auth/use-current-admin.ts`; `PermissionGate` — `src/components/auth/permission-gate.tsx`.
- Radix `Dialog` primitive — `src/components/ui/dialog.tsx` (exists, battle-tested, **but unused by ActionDialog**).
- `statusLabels` (Arabic enums) — `src/components/status/status-badge.tsx`.
- `formatDate` / `formatMoney` (ar-EG) — `src/lib/formatters.ts`.

---

## Phase 0 — Backend gap inventory → `bk-gaps.md` (do first; unblocks honest stubbing)

Create **`bk-gaps.md`** at the repo root: the single, deduped source of truth for everything the backend owes the admin. Built by merging `MISSING_APIS.md`, `backend-fixes-for-admin.md`, `new-apis.md`, and the in-code `<BackendGapCard>` warnings in `src/features/resources/admin-resource-pages.tsx` (lines ~304, 375, 589, 1386, 1424).

**Format per row:** `method · path · admin screen · priority · request shape · response shape · status (frontend-ready? / backend-done?)`.

**P0 — ship-blockers (16):** KYC list/detail/review (`GET/PATCH /v1/admin/verifications…`), order status/cancel (`PATCH /v1/admin/orders/:id/status`, `POST …/cancel`), refunds list/detail (`GET /v1/admin/refunds`, `…/:id`), payouts list/mark-paid (`GET /v1/admin/payouts`, `POST …/mark-paid`), vendor suspend/reinstate, billing cycles current/breakdown/close, ops health/activity-feed/alerts, analytics welcome-summary/pending-payouts-total/active-alerts-count.
**P1 — operational (14):** order events timeline, bulk-orders list, vendor geo-breakdown, commissions CRUD, notifications broadcast, vendor-billing accounts/invoices, reports export, vendor reinstate.
**P2 — nice-to-have (8):** geo GeoJSON, notifications history, audit-log detail/export, ops webhooks, ops job-run, health metrics outside `/v1`.

> Note: ~14 of these already have `adminPaths.*` builders and BFF routes wired (frontend is ready, backend isn't). `bk-gaps.md` must flag those as **"frontend done — awaiting backend"** so they're a backend-only lift.

Also note the **route-level gap**: `/notifications` is in the sidebar (`admin-shell.tsx`) but has no page → 404 (Phase 4).

---

## Phase 1 — Foundations (unblocks everything)

### 1.1 Lint/type/render-safety blockers
- **`src/components/modals/action-dialog.tsx:34-41`** — remove the render-phase `setState` (`if (open !== prevOpen) setPrevOpen(...)`); reset `reason` via `useEffect(() => { if (!open) setReason(""); }, [open])`.
- Sweep `admin-shell.tsx` and `vendor-notify-dialog.tsx` for the same anti-pattern.
- Skip the `isAdminUser` "type-guard fix" from the old plans — it is **already** `user is AdminUser` in `permissions.ts:90`.

### 1.2 Harden the edge auth gate — `src/proxy.ts`
- Add `Cache-Control: no-store, no-cache, must-revalidate` to **both** redirect responses (currently missing at `proxy.ts:15,21`) so an unauthenticated view is never cached.
- Keep the existing dual-cookie logic (`yalla_admin_session` OR `yalla_admin_refresh`) and `?next=` preservation — both already correct.

### 1.3 Harden the API client — `src/lib/api/admin-client.ts`
- Cap the 401→refresh→retry loop: if the retry also 401s, call `clearAuthCookies` and fire one `sonner` toast `"انتهت الجلسة — يرجى تسجيل الدخول مجدداً"`.
- Add a `getCsrfError()` helper so pages can render a 403 state on `CSRF_ORIGIN_BLOCKED`.
- Generate `crypto.randomUUID()` per request → forward as `x-request-id` (backend-proxy already passes it through) for log correlation.

### 1.4 Path & query-key hygiene
The `ResourceList` generic (`admin-resource-pages.tsx`) uses ad-hoc keys `[path, params]` instead of `queryKeys.*`. Sweep and centralize:
```
grep -RIn 'queryKey: \[' src/features
grep -RIn '"/api/admin' src/features src/components
```
Rule: no inline route strings, no anonymous query keys.

**Acceptance:** `npm run lint` + `npm run typecheck` pass clean.

---

## Phase 2 — The Dialog System (unblocks 3–5)

### 2.1 Rebuild `ActionDialog` on the existing Radix primitive
Reuse `src/components/ui/dialog.tsx` (already Radix-based: focus trap, Escape, portal, a11y for free) instead of the hand-rolled `<div>`. Add: `role`/`aria-modal`/`aria-labelledby` (Radix-native), `maxLength={500}` on the reason textarea, `useEffect` reason reset.

### 2.2 Kill `ConfirmActionDialog` (the fake inline card)
`src/components/modals/confirm-action-dialog.tsx` is a `<div>`, not a modal. **Delete it**; migrate its only real consumer (`media-page.tsx`) to `ActionDialog variant="danger"`.

### 2.3 Add `useConfirmDialog` hook → `src/hooks/use-confirm-dialog.ts`
Headless promise-based wrapper around `ActionDialog`. Replace **all 8 `window.confirm`** and **all 3 `window.prompt`** (verified locations):
- `window.confirm`: `media-page.tsx:91`; `remaining-admin-pages.tsx:236,702,811,919,994`; `admin-resource-pages.tsx:1012,1107`.
- `window.prompt`: `admin-resource-pages.tsx:366,445,446` (refund amount + reason → real form fields in an `ActionDialog`).

### 2.4 Fix the dropped/abused audit reasons
- **`src/components/dashboard/recent-vendors-table.tsx:56-70,175-179`** — stop sending the hardcoded `"تم الإيقاف من لوحة التحكم"`; pass the dialog's `reason` into the mutation.
- **`src/features/vendors/vendors-page.tsx:53-73,199-218`** — add `requireReason` on suspend and forward `reason` (currently no reason collected at all).
- **`src/features/users/users-page.tsx:242-256,378-381`** — `requireReason` is set for SUSPENDED but the mutation ignores it; thread it through.
- **`src/features/settings/maintenance-page.tsx:161-166`** — stop concatenating `reason` into `bannerMessage`; send it as a distinct audit field.
- Pattern reference (correct): `vendor-detail-page.tsx` already forwards reason properly.

---

## Phase 3 — Forms Everywhere (RHF + zod)

Only `src/features/users/create-admin-user-page.tsx` uses RHF today — make it the template. Install shadcn `Form` (`npx shadcn@latest add form`) and **delete `src/components/ui/form-field.tsx`** (it has dead `as`/`inputClassName` props — `void as; void inputClassName`).

Migrate every other form to RHF + zod + co-located schema, server errors via `form.setError`, reset on success, submit disabled while pending. Verified list (most-used first):
- `users-page.tsx` `CreateRoleForm`; `admin-resource-pages.tsx` (Promotions create ~1124, Banners ~1175, Shipping zones ~1276, Category attrs ~888); `remaining-admin-pages.tsx` (Brand ~508, StoreCategory ~565, Catalog attrs ~633, Promotion edit ~737, Banner edit ~834, Shipping vendor-rate ~1008, User role-assign ~120).

---

## Phase 4 — Make Every Button & Label Real (per-route audit)

Walk **every** route. The audit matrix below is the per-route checklist; fix as you go.

| Concern | Pass criteria |
| --- | --- |
| Reads | `useQuery` keyed from `queryKeys.*`, `adminApi`, `staleTime`, surfaces Error/Empty/Loading |
| Writes | `useMutation` + invalidation + toast + `ApiError` handling |
| Actions | every state change → `ActionDialog`, `requireReason` where audit-relevant |
| Confirmations | no `window.confirm/prompt` |
| Labels | correct Arabic; no English leak (`"Slug"`, `"Product"`/`"Banner"` alt fallbacks) |
| Data | no hardcoded/mock values |
| Buttons | no dead `onClick`/missing handler/404 link |

**Named fixes from the audit:**
- **Hardcoded sidebar metrics** — `admin-shell.tsx:54-73` ships static counts (vendors 1247, verifications 23, products 9824, orders 3512, billing 3, notifications "12"). Add a `GET /api/admin/admin/counts` BFF route (→ backend stats; log in `bk-gaps.md` if missing) and fetch live via React Query; render skeletons, not numbers, while loading.
- **Dead button** — `recent-vendors-table.tsx:86-88` "تصدير CSV" has no handler → wire it or remove it.
- **Missing `/notifications` page** — create `src/app/(admin)/notifications/page.tsx` (broadcast composer → `notificationsBroadcast()`); stub with `BackendPendingNotice` until the endpoint lands.
- **Backend-gap screens** — orders detail actions, refunds list/detail, bulk-orders, vendor-billing lists, ops jobs/webhooks: replace `<BackendGapCard>` ad-hoc text with a standard `BackendPendingNotice` (Phase 6), never a fake table.
- **English leakage** — translate `"Slug"` labels and `"Product"`/`"Banner"` alt fallbacks in both `resources/*.tsx` files; route all status text through `statusLabels`.

Go feature-by-feature: `auth, users, vendors, kyc, reviews, audit-logs, analytics, subscriptions, settings, media, resources` and the thin pages (`billing, bulk-orders, catalog, ops, orders, payments, promotions, refunds, shipping, dashboard`).

---

## Phase 5 — Server-side Auth & Permissions (defense-in-depth)

Today **every `(admin)` page is a client component with zero server-side gating** — auth lives only in `proxy.ts` + BFF. Close that gap.

### 5.1 Add `requirePagePermission` → `src/lib/auth/server-session.ts`
Adapt to the **real** session shape (`{ ok }`, not `{ status }`):
```ts
export async function requirePagePermission(permission: AdminPermission): Promise<AdminUser> {
  const session = await resolveAdminSession();
  if (!session.ok) { redirect("/login"); }
  if (!hasPermission(session.user, permission)) { notFound(); } // 403-style
  return session.user;
}
```

### 5.2 Gate every page
Each `src/app/(admin)/<area>/page.tsx` becomes a thin **server** component that calls `requirePagePermission("<area>:read")` (and `:write` for mutating pages), then renders the existing client feature. Use the canonical literals already in `permissions.ts` (22 defined: `dashboard:read`, `users:read/write`, `vendors:read/write`, `kyc:review`, `orders:read/write`, `reviews:moderate`, `payments:read`, `refunds:write`, `catalog:write`, `marketing:write`, `billing:write`, `settings:write`, `audit:read`, `ops:read`, `subscriptions:read`, `notifications:write`, `media:write`, `roles:write`).

### 5.3 Client-side hide
Wrap action buttons in `PermissionGate` / `hasPermission(...)` via `useCurrentAdmin()` so users never see controls they can't use. Confirm `permissionsForUser` fallbacks (super-admin vs read-only) are correct.

---

## Phase 6 — Backend Gaps: stub honestly

### 6.1 `BackendPendingNotice` → `src/components/state/backend-pending-notice.tsx`
A single warning card (`{ endpoint, priority }`) reading **"قيد الانتظار من الباك إند"** + the endpoint + priority + "موثّقة في bk-gaps.md". Use it on every gap screen. Never render fabricated data.

### 6.2 Keep `bk-gaps.md` live
Each item carries `Frontend done ✅ / Backend done ☐`. Tick as endpoints land. This is the backend team's contract.

---

## Phase 7 — Labels, i18n & Polish

- **`src/lib/i18n/strings.ts`** (typed const, not a runtime i18n lib — Arabic-only admin): centralize status labels, action labels (Approve/Reject/Suspend/Save/Cancel/Delete/Export/Filter/Search/Next/Prev), empty-state copy, error templates.
- **`src/lib/formatters.ts`** — already ar-EG/EGP/Gregorian; add explicit currency-via-`Intl` everywhere money renders; add `formatRelative` (Arabic).
- **RTL audit** — directional icons use `rtl:` variant; tables `dir="rtl"`; pagination arrows; sidebar collapse edge.
- **Three states on every list** — `EmptyState`, `TableSkeleton`, `ErrorState` (create the missing primitives under `src/components/state/`). No blank/`null` screens.

---

## Phase 8 — Observability & E2E

- `reportClientError(e)` from `window.onerror` + `unhandledrejection`, tagged with `requestId`.
- BFF request logging in `backend-proxy.ts`: method, path, status, duration, userId, requestId.
- Playwright specs (extend existing `tests/e2e/auth-redirect.spec.ts`): login→dashboard, vendors→suspend-with-reason, KYC→approve, settings→save, logout→redirect. Assert on Arabic-visible text via `getByRole`/`getByLabel`.
- a11y quick wins: all inputs labelled, images `alt`, contrast on `text-muted-foreground`/`bg-card`, skip-to-content.

---

## Phase 9 — Verification (gate at the end of every phase)

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # clean production build
npm run test:e2e    # Playwright green
```
All four scripts exist in `package.json`. Manual smoke on `localhost:3005` against a real backend:
- Login valid → `/dashboard`; invalid → Arabic error, no console errors.
- Every sidebar link → no 404 (incl. `/notifications`), no `window.confirm`.
- Every list: search / filter / paginate / row-click → no broken state.
- Every action: opens `ActionDialog`, requires reason where expected, sends `reason` in payload, toasts, invalidates.
- A read-only admin sees gated pages 403 and write buttons hidden.
- Logout → `/login`, both cookies cleared, refresh doesn't restore session.

---

## Files to create / modify

**Create**
- `bk-gaps.md` (Phase 0) · `PRODUCTION_READINESS.md` (runbook)
- `src/hooks/use-confirm-dialog.ts`
- `src/components/state/backend-pending-notice.tsx`, `empty-state.tsx`, `table-skeleton.tsx`, `error-state.tsx`
- `src/lib/i18n/strings.ts`
- `src/app/(admin)/notifications/page.tsx`
- `tests/e2e/{login,vendors,kyc,settings,logout}.spec.ts`

**Modify (highest-impact)**
- `src/proxy.ts` (no-store) · `src/lib/api/admin-client.ts` (401 cap, requestId, csrf helper)
- `src/lib/auth/server-session.ts` (`requirePagePermission`) · all `src/app/(admin)/**/page.tsx` (gate)
- `src/components/modals/action-dialog.tsx` (Radix rebuild) · delete `confirm-action-dialog.tsx`
- delete `src/components/ui/form-field.tsx`; migrate all forms (Phase 3 list)
- `src/components/layout/admin-shell.tsx` (live counts) · `src/components/dashboard/recent-vendors-table.tsx` (reason + CSV button)
- `src/features/{vendors,users}/…-page.tsx`, `src/features/settings/maintenance-page.tsx` (reasons)
- `src/features/resources/{admin-resource-pages,remaining-admin-pages}.tsx` (confirm/prompt, forms, labels, gap notices)

## Execution order (one PR per phase)
0 (bk-gaps) → 1 (foundations) → 2 (dialogs) → 5 (server auth, parallel-safe) → 3 (forms) → 4 (per-route) → 6 (gap stubs) → 7 (polish) → 8 (observability). Phase 9 runs at the end of each.

## Outcome
Every button works, every label is correct Arabic, every read comes from the backend, every mutation is dialog-driven with an audit reason where it matters, every page is server-gated, backend gaps are honestly stubbed and tracked in `bk-gaps.md`, and the operator has real tools to run the marketplace.
