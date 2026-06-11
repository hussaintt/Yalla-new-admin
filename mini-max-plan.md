# YallaNew Admin — Production Readiness Plan

A phased, opinionated plan to take the current admin panel from "prototype that mostly renders" to a real, safe, fully wired operations tool. Every button works, every label is correct Arabic, every read comes from the backend, every mutating action goes through `ActionDialog` with a reason where it matters, and every screen is permission-gated server-side.

The plan deliberately separates **frontend gaps** (which we can ship today) from **backend gaps** (which get documented in `MISSING_APIS.md` and rendered as a clean "قيد الانتظار من الباك إند" empty state until the API lands).

---

## 0. Guiding Principles

1. **Backend is the source of truth.** If a value isn't in the API response, we don't fabricate it.
2. **One form strategy.** `react-hook-form` + `zod` + `zodResolver` everywhere, schema co-located in `features/<domain>/schema.ts`.
3. **One dialog strategy.** `ActionDialog` for every state change (with `requireReason` for audit-relevant mutations), `useConfirmDialog` hook for plain confirms. No `window.confirm` anywhere.
4. **Server-side gate, client-side hide.** Pages call `resolveAdminSession()` + `permissionsForUser`; UI hides via `hasPermission`. The server is never trusted-blind.
5. **RTL + Arabic first.** All new strings in Arabic; technical identifiers stay in English. Use `Intl.NumberFormat('ar-EG')` / `Intl.DateTimeFormat('ar-EG')` via `src/lib/formatters.ts`.
6. **Track it.** A persistent `PRODUCTION_READINESS.md` checklist at the repo root is the single source of truth for what's done. The plan file is the blueprint; the checklist is the runbook.

---

## Phase 1 — Foundations (must be done first; everything else depends on it)

These are infrastructure-level fixes that unblock every other phase.

### 1.1 Fix the type-safety and lint blockers

`server-session.ts` has a known narrowing bug, and two components (`admin-shell.tsx`, `action-dialog.tsx`) use the render-phase `setState` anti-pattern that trips stricter lint configs.

- **`src/lib/auth/server-session.ts`** — Update `isAdminUser` to act as a TypeScript type guard (`user is AdminUser`) so callers don't need to re-null-check.
- **`src/components/layout/admin-shell.tsx`** — Close mobile nav directly in click handlers; remove the `useEffect` listening to `pathname`. Use the existing `[prevOpen, setPrevOpen]` pattern if a prop-driven reset is truly needed.
- **`src/components/modals/action-dialog.tsx`** — Replace the render-phase `setPrevOpen` with a `useEffect(() => { if (!open) setReason(""); }, [open])`. Same for `vendor-notify-dialog.tsx`.

**Acceptance:** `npm run lint` and `npm run typecheck` both pass with zero errors.

### 1.2 Confirm/fix the edge auth gate

`src/proxy.ts` already exists and redirects unauthenticated traffic to `/login`. Verify it actually:

- Runs on all routes except `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`, `/manifest.json`, `/icons/*`.
- Treats *both* `yalla_admin_session` and `yalla_admin_refresh` as valid (the refresh cookie alone should keep the user out of the login page while a 401-triggered refresh runs).
- Sets `Cache-Control: no-store` on the redirect response so the browser never caches an unauthenticated view.

**If `proxy.ts` is missing or incomplete** (per `ADMIN_PANEL_IMPLEMENTATION_PLAN.md` §2), create/finish it. This is the single most important production safety net.

### 1.3 Solidify the API client

Audit and harden `src/lib/api/admin-client.ts` and `src/lib/api/backend.ts`:

- `adminApi<T>()` already handles 401 → refresh → retry once. Add a hard cap: if the second attempt also 401s, call `clearAuthCookies` and emit a single `sonner` toast "انتهت الجلسة — يرجى تسجيل الدخول مجدداً" before the caller re-renders.
- Centralize the `CSRF_ORIGIN_BLOCKED` 403 path: a `getCsrfError()` helper that pages can read and render a 403 component.
- Add a small `requestId` middleware: generate `crypto.randomUUID()` per request and forward it as `x-request-id` so backend logs and our logs correlate. Surface it in error toasts in dev only.

**Acceptance:** Verified by toggling the access cookie to invalid → call hits `/api/auth/refresh` → success → original request retries → no flicker.

### 1.4 Path & query-key hygiene

Every fetch must go through `adminPaths.*` and `queryKeys.*`. Today's audit shows paths are mostly centralized; do a final sweep:

```bash
grep -RIn '"/api/admin' src/features src/components
grep -RIn 'queryKey: \[' src/features
```

Anything that escapes gets fixed. The rule is mechanical: **no inline route strings, no anonymous query keys**.

---

## Phase 2 — The Dialog System (unblocks Phases 3–6)

We are rewriting the modal layer once, properly, and removing every `window.confirm`.

### 2.1 Build a real `ConfirmActionDialog`

`src/components/modals/confirm-action-dialog.tsx` is currently a misleadingly-named inline card. Either:

- **Delete it** and have its only consumer (`media-page.tsx`) use `ActionDialog` with `variant="danger"`, **or**
- **Rename it** to `InlineDeleteAction` and stop using "Dialog" in the name.

Recommendation: delete and consolidate.

### 2.2 Harden `ActionDialog`

Add the standard modal a11y + UX bits that every dialog needs:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.
- Focus trap (Radix `Dialog` primitive via shadcn `Dialog` would be the cleanest; otherwise hand-rolled).
- `Escape` to close (Radix does this for free).
- `maxLength={500}` on the reason textarea (matches `VendorNotifyDialog`).
- Reset `reason` via `useEffect` (replaces the render-phase `setPrevOpen`).
- Render via Radix `Portal` to `body` to avoid z-index/overflow traps.

### 2.3 Add a `useConfirmDialog` hook

A tiny headless wrapper around `ActionDialog` (variant=neutral) so plain confirms become one line:

```ts
const { confirm, dialog } = useConfirmDialog();

const onDelete = async () => {
  const ok = await confirm({
    title: "حذف المستخدم",
    description: "لا يمكن التراجع عن هذا الإجراء.",
    confirmLabel: "حذف",
    variant: "danger",
  });
  if (!ok) return;
  mutation.mutate(id);
};
```

Then go through the codebase and **replace all 8 `window.confirm` calls** with this hook (locations already known: `media-page.tsx:91`, `resources/remaining-admin-pages.tsx:236, 702, 811, 919, 994`, `resources/admin-resource-pages.tsx:1012, 1107`).

### 2.4 Fix the two known ActionDialog bugs

- **`src/components/dashboard/recent-vendors-table.tsx:166`** — `suspendMutation.mutate(suspend.id)` is called without the `reason` collected by the dialog. Pass it: `suspendMutation.mutate({ id: suspend.id, reason })`.
- **`src/features/settings/maintenance-page.tsx:146`** — Stop appending the audit reason into `bannerMessage`. Send `reason` as a distinct field in the payload.

### 2.5 Require reason for audit-relevant status changes

- `src/features/vendors/vendors-page.tsx:199` — vendor approve/suspend should set `requireReason: true` on suspend, optional on approve.
- `src/features/users/users-page.tsx:368` — ACTIVE↔SUSPENDED should require a reason.
- `src/components/dashboard/billing-cycle-card.tsx:142` — closing a billing cycle is irreversible, require a reason.

---

## Phase 3 — Forms Everywhere

Right now only `create-admin-user-page.tsx` uses `react-hook-form` + `zod`. The other ~12 forms use raw `useState` + `FormField` with no schema, no field errors, no reset on success. We migrate all of them.

### 3.1 Establish the form pattern

For every form in the app:

```ts
// features/<domain>/schema.ts
import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  permissions: z.array(z.string()).min(1, "اختر صلاحية واحدة على الأقل"),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
```

```tsx
// features/<domain>/form.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, Controller } from "react-hook-form";

export function CreateRoleForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", permissions: [] },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateRoleInput) => adminApi("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(values),
    }),
    onSuccess: () => {
      toast.success("تم إنشاء الدور");
      form.reset();
      queryClient.invalidateQueries({ queryKey: queryKeys.roles });
      onSuccess();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.statusCode === 409) {
        form.setError("name", { type: "server", message: "هذا الاسم مستخدم" });
        return;
      }
      toast.error(normalizeApiError(e).message);
    },
  });

  return <FormProvider {...form}>...</FormProvider>;
}
```

### 3.2 Wire `FormField` to `FormProvider`

`src/components/ui/form-field.tsx` declares but ignores `as` and `inputClassName` props (dead code) and isn't wired to RHF. Either:

- Make `FormField` a thin shell that reads from `useFormContext` and renders the right input via the `as` prop, **or**
- Replace it with shadcn's `Form` primitives (which are RHF-native and already battle-tested).

Recommendation: use shadcn `Form` (add via `npx shadcn@latest add form`) and delete `form-field.tsx`. The shadcn version is `react-hook-form`-native, has the `Controller` plumbing done, and supports all the input types we need.

### 3.3 Migration list

Forms to migrate (in this order, so the most-used are fixed first):

1. `create-admin-user-page.tsx` — already done, use it as the template.
2. `users-page.tsx` — `CreateRoleForm` (line ~170).
3. `resources/remaining-admin-pages.tsx`:
   - `CatalogAttributeDetailPage` (line ~688)
   - `BannerDetailPage` (line ~889)
4. `resources/admin-resource-pages.tsx`:
   - `SimpleCreateForm` (line ~1023)
   - `BannerCreatePage` (line ~1212)
   - All other resource edit pages in this file
5. `vendor-detail-page.tsx` — vendor status + document review forms.
6. `kyc/verifications-page.tsx` — review form.
7. `reviews-page.tsx` — review moderation form.
8. `settings/*` — every settings editor page.
9. `subscriptions/*` — every subscription editor.

For each form: write the schema, wire RHF, ensure required fields have `aria-required` + visual `*`, surface server errors via `form.setError`, reset on success, disable submit while `mutation.isPending`.

---

## Phase 4 — Audit and Fix Every Feature

For each feature folder, walk every page, every hook, every action button, and verify. The matrix below is the audit checklist; the per-feature subsections list concrete fixes.

| Concern | What to check |
| --- | --- |
| Reads | Hook uses `useQuery` with a key from `queryKeys.*`, calls `adminApi`, has `staleTime` ≥ 30s, surfaces `ErrorState` |
| Writes | Hook uses `useMutation`, has `onSuccess` invalidation, has toast, handles `ApiError` |
| Forms | `react-hook-form` + `zod` + co-located schema |
| Actions | All state changes go through `ActionDialog` with `requireReason` where audit-relevant |
| Confirmations | No `window.confirm` — all use `useConfirmDialog` |
| Labels | Arabic, grammatically correct, no English leakage |
| Data | No hardcoded/mock values, no `??` defaults that hide missing data |
| Permissions | Server-side `resolveAdminSession` + `permissionsForUser`; client-side `hasPermission` to hide |
| Types | No `any`, no `@ts-ignore`, no `as` casts outside the type-guard |

### 4.1 `features/auth`

- `use-current-admin.ts` — uses `queryKeys.me` ✅. Add `staleTime: 60_000` (the user doesn't change every 30s).
- Login page (`(auth)/login/page.tsx`) — verify it handles `ApiError` with proper Arabic messages, rate-limits the user feedback (disable button for 5s after error), clears the password field on failure.

### 4.2 `features/users`

- `users-page.tsx`:
  - Add `requireReason` for ACTIVE↔SUSPENDED status changes.
  - Migrate `CreateRoleForm` to RHF+zod.
  - Verify pagination, search debounce, status filter all work end-to-end.
  - Add a "Copy user ID" affordance for support workflows.
- `create-admin-user-page.tsx` — already on RHF; ensure it has E2E coverage.

### 4.3 `features/vendors`

- `vendors-page.tsx`:
  - Search debounce (200ms).
  - Status filter wired to `adminPaths.vendors({ status })`.
  - Suspend action requires reason.
  - Cursor pagination verified.
- `vendor-detail-page.tsx`:
  - All sections (info, members, KYC, subscriptions, billing summary) actually fetch and render.
  - Approve / Reject / Suspend buttons all open `ActionDialog`.
  - Notes section writes to backend.
- `use-vendor-notify.ts` — verify `onSuccess` invalidates `vendorDetail` and shows toast.

### 4.4 `features/kyc`

- `verifications-page.tsx`:
  - Filter by status (PENDING / APPROVED / REJECTED).
  - Review dialog requires reason on reject.
  - After review, invalidate `queryKeys.verifications` and `queryKeys.dashboard.kycQueue`.

### 4.5 `features/reviews`

- `reviews-page.tsx`:
  - Approve / Reject with reason.
  - Filter by product, vendor, status, rating.
  - Empty state copy in Arabic.

### 4.6 `features/audit-logs`

- `audit-log-diff-section.tsx` — verifies it actually renders the diff payload from `queryKeys.auditLogDiff(id)`. Add export-to-CSV button (per `MISSING_APIS.md` §7, P2 — show as "قيد الانتظار" if backend not ready).

### 4.7 `features/analytics`

- `use-funnel.ts`, `use-revenue-trends.ts` — add `staleTime: 30_000` and `staleTime: 60_000` respectively.
- Dashboard widgets in `src/components/dashboard/*` — verify each one shows `ErrorState` and a skeleton during load. Fix any that swallow errors silently.

### 4.8 `features/subscriptions`

- Every page in here is a candidate for RHF migration. Verify data sources, action flows.

### 4.9 `features/settings`

- `maintenance-page.tsx` — fix the banner-message corruption (Phase 2.4).
- All settings pages: schema-validated forms, optimistic updates where safe, toast on save.

### 4.10 `features/media`

- `media-page.tsx`:
  - Replace the inline `ConfirmActionDialog` usage with real `ActionDialog` (Phase 2.1).
  - Bulk purge uses `useConfirmDialog` (Phase 2.3).
  - Orphan list is paginated via cursor.

### 4.11 `features/resources`

- `resources/remaining-admin-pages.tsx` and `resources/admin-resource-pages.tsx` are the "long-tail" pages (catalog attributes, banners, store categories, etc.). Migrate every form in these files (Phase 3.3).

### 4.12 Pages that have no `features/*` folder

`billing/`, `bulk-orders/`, `catalog/`, `ops/`, `orders/`, `payments/`, `promotions/`, `refunds/`, `shipping/`, `audit-logs/`, `dashboard/` — many of these are currently thin pages with a single component. For each:

- Verify the page calls `resolveAdminSession()` and renders a forbidden state if `!hasPermission(user, "<page>:read")`.
- Verify the page uses `<PageHeader>` and `<CursorDataTable>` where appropriate.
- Verify every status change goes through `ActionDialog`.
- Stub any feature whose backend is in `MISSING_APIS.md` with a `<BackendPendingNotice endpoint="..."/>` component.

---

## Phase 5 — Wire All Pages to Server-Side Auth & Permissions

Right now the proxy gate keeps anonymous users out, but individual pages don't enforce permissions. We close that gap.

### 5.1 Add a `requirePagePermission` helper

In `src/lib/auth/server-session.ts`:

```ts
export async function requirePagePermission(
  permission: AdminPermission,
): Promise<AdminUser> {
  const session = await resolveAdminSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "error") throw session.error;
  if (!hasPermission(session.user, permission)) {
    // Render a 403 via a not-found-like page, or throw.
    notFound();
  }
  return session.user;
}
```

### 5.2 Update every server page

For every `src/app/(admin)/<area>/<page>/page.tsx`:

- Replace the manual `resolveAdminSession()` dance with `requirePagePermission("<area>:read")`.
- For pages that perform writes, also gate on `<area>:write`.
- Render `<PageHeader title=... subtitle=... />` with breadcrumb.
- Pass the user + permissions down to the client component (or re-fetch with `useCurrentAdmin`).

### 5.3 Permission matrix

Map every UI action to a permission from `src/lib/auth/permissions.ts`. Add new permissions as needed (e.g., `billing:close_cycle`, `maintenance:write`). Audit and confirm:

| Domain | Read | Write | Special |
| --- | --- | --- | --- |
| users | `users:read` | `users:write` | `users:impersonate` |
| vendors | `vendors:read` | `vendors:write` | `vendors:suspend` |
| kyc | `kyc:read` | `kyc:review` | — |
| products | `products:read` | `products:write` | `products:publish` |
| orders | `orders:read` | `orders:write` | `orders:cancel` |
| refunds | `refunds:read` | `refunds:write` | `refunds:approve` |
| payouts | `payouts:read` | `payouts:approve` | — |
| billing | `billing:read` | `billing:close_cycle` | — |
| promotions | `promotions:read` | `promotions:write` | `promotions:publish` |
| settings | `settings:read` | `settings:write` | `settings:maintenance` |
| audit | `audit:read` | — | `audit:export` |
| ops | `ops:read` | `ops:run_jobs` | — |

Verify the permission constants in `permissions.ts` line up. Add the missing ones.

### 5.4 Client-side hiding

In every client component that renders an action button:

```tsx
const { hasPermission } = useCurrentAdmin();
{hasPermission("vendors:suspend") && <SuspendButton ... />}
```

Plus a `<PermissionGuard permission="..."/>` component for inline hiding.

---

## Phase 6 — Backend Gaps: Document and Stub

For every endpoint in `MISSING_APIS.md`, add a corresponding entry in the backend team's tracker (or update the existing file), and render a clear empty state in the UI.

### 6.1 Backend gap inventory

From `MISSING_APIS.md` (P0/P1/P2 priorities), plus a sweep of every page in `src/app/(admin)/` to find any that 404s:

**P0 (ship-blockers for real ops):**
- `GET /v1/admin/verifications` (global KYC queue)
- `GET /v1/admin/verifications/:id`
- `PATCH /v1/admin/verifications/:id/review`
- `PATCH /v1/admin/orders/:id/status`
- `POST /v1/admin/orders/:id/cancel`
- `GET /v1/admin/refunds`
- `GET /v1/admin/refunds/:id`
- `GET /v1/admin/payouts`
- `POST /v1/admin/payouts/:id/mark-paid`

**P1 (operational visibility):**
- `GET /v1/admin/orders/:id/events`
- `GET /v1/admin/bulk-orders`
- `GET /v1/admin/vendor-billing/accounts`
- `GET /v1/admin/vendor-billing/invoices`

**P2 (nice-to-have):**
- `GET /v1/admin/audit-logs/:id` (diff detail)
- `GET /v1/admin/audit-logs/export`
- `GET /v1/admin/ops/webhooks`
- `POST /v1/admin/ops/jobs/:name/run`

### 6.2 `BackendPendingNotice` component

```tsx
// src/components/state/backend-pending-notice.tsx
export function BackendPendingNotice({ endpoint, priority }: {
  endpoint: string;
  priority: "P0" | "P1" | "P2";
}) {
  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          قيد الانتظار من الباك إند
        </CardTitle>
        <CardDescription>
          هذه الشاشة تعتمد على نقطة النهاية <code className="font-mono text-xs">{endpoint}</code>،
          والتي لم تكتمل بعد ({priority}). تم توثيقها في MISSING_APIS.md.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
```

Use it on every page where the backend isn't ready. Never render a fake table with hardcoded data.

### 6.3 Update `MISSING_APIS.md`

For each P0 item: include request/response shape, error cases, and a "Frontend done" / "Backend done" checkbox that we tick as we go. Keep the file the single source of truth for what's outstanding.

---

## Phase 7 — Labels, i18n, and a Polish Pass

### 7.1 Centralized Arabic strings

Right now labels are inline. Create `src/lib/i18n/strings.ts` (a typed const, not a runtime i18n library — overkill for an Arabic-only admin) for:

- Status labels (Active/Suspended/Pending/Approved/Rejected) with proper Arabic and gender agreement.
- Action labels (Approve, Reject, Suspend, Save, Cancel, Confirm, Delete, Export, Filter, Search, Reset, Next, Previous).
- Empty-state messages.
- Error messages (with placeholders: `{name} غير موجود`).

This is the only way to keep copy consistent across 20+ pages without drift.

### 7.2 Date/number formatters

`src/lib/formatters.ts` already exists. Audit it for:

- Hijri vs Gregorian — the admin is `lang="ar"` but most ops users think Gregorian. Make the format explicit and add a user setting.
- Currency — make sure all money renders via `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`, not via `toLocaleString`.
- Relative time ("قبل 5 دقائق") — verify `date-fns` is being used with Arabic locale, or roll a small `formatRelative(ar)` helper.

### 7.3 RTL audit

- All flex/grid layouts that need `flex-row-reverse` in RTL.
- Icons that imply direction (chevrons, arrows) — use the `rtl:` Tailwind variant to flip them.
- Tables: `dir="rtl"` on the table element, ensure pagination arrows point the right way.
- Sidebar: collapse direction should be on the right edge in RTL.

### 7.4 Empty states, loading states, error states

For every list page, verify three states render correctly:

- **Loading:** skeleton (use a small `<TableSkeleton rows={5} cols={n}/>` primitive).
- **Empty:** `<EmptyState title="لا توجد نتائج" description="حاول تغيير عوامل التصفية" />` with an Arabic icon.
- **Error:** `<ErrorState error={e} onRetry={refetch}/>` with a "إعادة المحاولة" button.

Audit every page; anything showing `null` or a blank screen on error is a bug.

---

## Phase 8 — Observability, Logging, and Error Reporting

### 8.1 Frontend error reporting

Wire `window.onerror` + `unhandledrejection` to a single `reportClientError(e)` helper. For now it logs to console with the `requestId`; later it can post to a `/v1/admin/client-errors` endpoint (add to `MISSING_APIS.md` if needed).

### 8.2 Server-side logging

The BFF proxy should log every upstream call with: method, path, status, duration, userId, requestId. This is what makes "the API was slow" actually diagnosable. Add to `src/lib/api/backend.ts`.

### 8.3 Playwright E2E

`tests/e2e/auth-redirect.spec.ts` exists. Add specs for the critical paths:

- Login → dashboard.
- Login → vendors → suspend with reason.
- Login → KYC → review approve.
- Login → settings → save.
- Logout → redirect to /login.

For each, use Playwright recommended locators (`getByRole`, `getByLabel`) and assert on Arabic-visible text.

### 8.4 Lighthouse / a11y quick wins

- Add `<html lang="ar">` ✅ (already done).
- All images have `alt`.
- All form inputs have associated `<label>`s.
- Color contrast — Tailwind defaults are usually fine, but `text-muted-foreground` on `bg-card` should be ≥ 4.5:1.
- Skip-to-content link on every page.

---

## Phase 9 — Verification (every phase ends with this)

Run after every phase; fix what's red before moving on.

```bash
npm run lint          # zero errors
npm run typecheck     # zero errors
npm run build         # clean production build
npm run test:e2e      # all Playwright specs pass
```

Manual smoke (after each phase, on `localhost:3005` with a real backend):

- [ ] Login with valid credentials → land on `/dashboard`.
- [ ] Login with invalid → see Arabic error, no console errors.
- [ ] Visit every sidebar link → no 404, no `window.confirm`, no `console.log`.
- [ ] On every list page: search, filter, paginate, click row → no broken state.
- [ ] On every action button: opens `ActionDialog`, requires reason where expected, sends `reason` in payload, shows toast, invalidates queries.
- [ ] Logout → land on `/login`, both cookies cleared, refreshing doesn't restore session.

---

## PRODUCTION_READINESS.md checklist

The repo gets a new top-level file with a checkbox per item. The plan is the blueprint; the checklist is the runbook.

```markdown
# YallaNew Admin — Production Readiness Checklist

## Phase 1: Foundations
- [ ] server-session type guard fix
- [ ] admin-shell + action-dialog setState-in-render fix
- [ ] proxy.ts auth gate verified
- [ ] adminApi 401→refresh→retry capped
- [ ] Path & query-key sweep clean

## Phase 2: Dialog System
- [ ] ConfirmActionDialog deleted or renamed
- [ ] ActionDialog: role/aria/focus-trap/Escape/maxLength
- [ ] useConfirmDialog hook created
- [ ] All 8 window.confirm calls migrated
- [ ] recent-vendors-table suspend reason wired
- [ ] maintenance-page reason not appended to banner
- [ ] requireReason added to vendor/user/billing-cycle status changes

## Phase 3: Forms
- [ ] shadcn Form installed
- [ ] form-field.tsx deleted
- [ ] All ~12 forms migrated to RHF + zod

## Phase 4: Per-Feature Audit
- [ ] features/auth
- [ ] features/users
- [ ] features/vendors
- [ ] features/kyc
- [ ] features/reviews
- [ ] features/audit-logs
- [ ] features/analytics
- [ ] features/subscriptions
- [ ] features/settings
- [ ] features/media
- [ ] features/resources
- [ ] pages with no features/ folder (billing, bulk-orders, catalog, ops, orders, payments, promotions, refunds, shipping, audit-logs, dashboard)

## Phase 5: Server-Side Auth
- [ ] requirePagePermission helper added
- [ ] All server pages gated
- [ ] Permission matrix complete
- [ ] PermissionGuard component added

## Phase 6: Backend Gaps
- [ ] BackendPendingNotice component added
- [ ] All P0 endpoints in MISSING_APIS.md
- [ ] All P1 endpoints in MISSING_APIS.md
- [ ] All P2 endpoints in MISSING_APIS.md
- [ ] All gap-pages render BackendPendingNotice

## Phase 7: Labels & Polish
- [ ] src/lib/i18n/strings.ts created
- [ ] Status, action, empty-state strings centralized
- [ ] Date/number formatters audited
- [ ] RTL audit pass complete
- [ ] Empty/loading/error states on every list page

## Phase 8: Observability
- [ ] reportClientError helper
- [ ] Server-side request logging
- [ ] Playwright specs for critical paths
- [ ] a11y quick wins applied

## Phase 9: Verification
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] npm run build passes
- [ ] npm run test:e2e passes
- [ ] Manual smoke checklist complete
```

---

## Key files to be created or modified

**New files:**
- `PRODUCTION_READINESS.md` — the runbook checklist
- `src/components/state/backend-pending-notice.tsx` — gap placeholder
- `src/components/state/permission-guard.tsx` — inline client-side hide
- `src/components/state/empty-state.tsx` — standardized empty list state
- `src/components/state/table-skeleton.tsx` — standardized loading
- `src/hooks/use-confirm-dialog.ts` — headless confirm wrapper
- `src/lib/i18n/strings.ts` — centralized Arabic copy
- `src/lib/auth/permissions-matrix.ts` — read/write/special permissions per domain
- `tests/e2e/login.spec.ts`, `tests/e2e/vendors.spec.ts`, `tests/e2e/kyc.spec.ts`, `tests/e2e/settings.spec.ts`, `tests/e2e/logout.spec.ts`

**Modified files (most impactful):**
- `src/lib/auth/server-session.ts` — type guard, `requirePagePermission`
- `src/lib/api/admin-client.ts` — 401 cap, requestId, normalized error
- `src/lib/auth/permissions.ts` — fill gaps from the matrix
- `src/components/modals/action-dialog.tsx` — a11y, focus trap, Escape, useEffect reset
- `src/components/modals/confirm-action-dialog.tsx` — delete (or rename)
- `src/components/ui/form-field.tsx` — delete in favor of shadcn Form
- `src/components/dashboard/recent-vendors-table.tsx` — pass reason to mutation
- `src/features/settings/maintenance-page.tsx` — separate reason field
- `src/features/vendors/vendors-page.tsx` — requireReason on suspend
- `src/features/users/users-page.tsx` — requireReason on status, RHF migrate
- `src/features/analytics/use-funnel.ts`, `use-revenue-trends.ts` — staleTime
- `src/features/auth/use-current-admin.ts` — staleTime
- All 8 `window.confirm` callers
- All `src/app/(admin)/**/page.tsx` — `requirePagePermission` gate
- `MISSING_APIS.md` — add all P0/P1/P2 endpoints with checkboxes

---

## Execution order (one PR per phase is fine)

1. **Phase 1** (foundations) — unblocks everything.
2. **Phase 2** (dialog system) — used by every later form fix.
3. **Phase 5** (server-side auth) — independent, can run in parallel with 3/4.
4. **Phase 3** (forms) — biggest diff, do it after 2 lands.
5. **Phase 4** (per-feature audit) — touch every feature, ride on Phase 2 + 3.
6. **Phase 6** (backend gaps) — render-only changes, fast.
7. **Phase 7** (polish) — final pass, requires everything else to be stable.
8. **Phase 8** (observability) — last, after the app is feature-complete.
9. **Phase 9** (verification) — gate, not a phase; runs at the end of every other phase.

After all phases: every button works, every label is correct Arabic, every read comes from the backend, every mutating action is dialog-driven, every page is server-side gated, and the operator has real tools to run the marketplace.
