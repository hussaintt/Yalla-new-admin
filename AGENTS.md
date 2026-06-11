<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Yalla New Admin — Agent Guide

A concise operating manual for AI agents (and humans) working on this codebase.
The app is a Next.js 16 App Router admin panel for the Yalla New marketplace. It
is a thin BFF (Backend-for-Frontend) over a separate Node.js API and a
React-Query/Tailwind UI shell.

---

## 1. Tech Stack (pin these assumptions)

- **Framework:** Next.js `16.2.7` (App Router) on React `19.2.4` — *not* the
  Next.js most models were trained on. Check `node_modules/next/dist/docs/`
  before writing routing, server-action, or caching code.
- **Language:** TypeScript `5` with `strict: true`. Path alias `@/*` →
  `./src/*`.
- **Styling:** Tailwind CSS `4` via `@tailwindcss/postcss`, driven by CSS
  variables in `src/app/globals.css`. shadcn/ui (`new-york` style, `lucide`
  icons, neutral base). Components live in `src/components/ui/`. Aliases in
  `components.json`.
- **Data:** `@tanstack/react-query` `5` (client cache, `staleTime: 30s`,
  `retry: 1`, no refetch on window focus). `@tanstack/react-table` `8` for
  tables.
- **Forms/validation:** `react-hook-form` `7` + `@hookform/resolvers` + `zod` `4`.
- **Charts:** `recharts` `3`.
- **State:** `zustand` `5` (sparingly — most state is server state).
- **Feedback:** `sonner` for toasts (mounted in `src/app/providers.tsx`).
- **Dates/utils:** `date-fns`, `clsx`, `tailwind-merge` (combined in
  `src/lib/utils.ts` as `cn`).
- **Testing:** Playwright (config in `playwright.config.ts`, port `3001`,
  chromium only).
- **Language direction:** the `<html>` element is `lang="ar" dir="rtl"` — the
  UI is Arabic-first. Layout, icons, and sidebars must remain RTL-safe.

## 2. Scripts & Local Setup

| Command            | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Dev server on port **3005**                          |
| `npm run build`    | Production build                                     |
| `npm run start`    | Production server on port **3005**                   |
| `npm run lint`     | ESLint (Next core-web-vitals + TS configs)           |
| `npm run typecheck`| `tsc --noEmit`                                       |
| `npm run test:e2e` | Playwright (auto-starts dev on `3001`)               |
| `npm run api:types`| Regenerate `src/lib/api/generated/schema.d.ts` from backend OpenAPI |

Required env (see `.env.example`): `YALLA_API_BASE_URL`, `BACKEND_OPENAPI_URL`,
`ADMIN_SESSION_COOKIE_NAME`, `ADMIN_REFRESH_COOKIE_NAME`,
`NEXT_PUBLIC_ADMIN_APP_NAME`.

## 3. Top-Level Layout

```
src/
  app/                     # Next App Router
    (auth)/login/          # Public — login screen only
    (admin)/               # Protected — every operational page
    api/                   # BFF routes
      auth/{login,logout,refresh,me}/route.ts
      admin/[...path]/     # Generic proxy → backend /v1/admin/*
      system/[...path]/    # Generic proxy → backend /v1/system/*
    layout.tsx             # Root <html dir="rtl"> + Providers
    providers.tsx          # QueryClient + Sonner toaster
    globals.css            # Tailwind v4 + design tokens
  components/
    layout/                # AdminShell, PageHeader
    modals/                # ActionDialog, ConfirmActionDialog
    data-table/            # CursorDataTable, CursorPager, TableToolbar
    status/, state/, auth/, clickable-image*, image-upload-input, ui-switch
    ui/                    # shadcn primitives (add via shadcn CLI)
  features/                # Domain UI: auth, vendors, kyc, users, reviews, resources
  lib/
    api/                   # adminApi client, backend proxy helpers, errors, query keys
    auth/                  # cookies, permissions, server-session resolver
    formatters.ts, utils.ts
public/, tests/e2e/, playwright-report/
```

### Route groups
- **`(auth)`** — unauthenticated screens. Only `/login` lives here.
- **`(admin)`** — every authenticated page. Wrapped in `<AdminShell>`
  (`src/app/(admin)/layout.tsx`). Sub-areas: `dashboard`, `users`,
  `vendors`, `verifications` (KYC), `products`, `catalog/{brands,attributes,
  store-categories,categories}`, `orders`, `bulk-orders`, `payments`,
  `refunds`, `billing/{overview,vendors,payments,invoices,jobs}`, `shipping/
  {methods,zones,vendor-rates,quote-tester}`, `promotions`, `banners`,
  `reviews`, `audit-logs`, `ops/{health,queues,jobs,webhooks}`, `settings`.

## 4. Auth, Sessions, and BFF Proxy — How Requests Actually Flow

The admin panel never talks to the backend directly from the browser. Every
authenticated request goes through a Next BFF route that:

1. Reads `ADMIN_SESSION_COOKIE_NAME` (access) and `ADMIN_REFRESH_COOKIE_NAME`
   (refresh) via `cookies()` (see `src/lib/auth/cookies.ts`).
2. Forwards the request to `${YALLA_API_BASE_URL}/v1/...` with
   `Authorization: Bearer <access>` and a small allowlist of passthrough
   headers (`accept`, `accept-language`, `content-type`, `x-request-id`,
   `x-idempotency-key`).
3. On `401`, attempts a one-shot refresh via `refreshAdminTokens` and retries
   the upstream call. Emits new cookies via `setAuthCookies`.
4. On terminal auth failure, calls `clearAuthCookies` so the browser drops
   them.
5. Enforces a same-origin check for unsafe methods (`POST/PUT/PATCH/DELETE`)
   with a `CSRF_ORIGIN_BLOCKED` 403.
6. Streams binary responses (images, PDFs, spreadsheets, zip, audio/video)
   through unchanged via `streamBackendResponse` in
   `src/lib/api/backend.ts`.

**Client-side** (`src/lib/api/admin-client.ts`):
- `adminApi(path, options)` is a thin `fetch` wrapper used inside React
  Query hooks. It sets `credentials: "same-origin"`, JSON headers by
  default, and transparently POSTs to `/api/auth/refresh` on a 401 and
  retries once.
- Always use the relative `/api/admin/...` (or `/api/system/...`) path
  with `adminApi` — never put `${YALLA_API_BASE_URL}` in client code.

**Server-side session** (`src/lib/auth/server-session.ts`):
- `resolveAdminSession()` returns a discriminated union. Use it in any
  server component / route handler that needs the current admin.
- `isAdminUser(user)` is a TypeScript type guard (`user is AdminUser`) —
  rely on the narrowing, do not re-check `user` for nullability after the
  guard.

**Permissions** (`src/lib/auth/permissions.ts`):
- `AdminPermission` is the canonical enum. Always use these string literals
  in `hasPermission(user, "vendors:write")`-style checks.
- `isSuperAdminUser` / `isAdminUser` gate role access. Effective permissions
  come from `user.permissions` if present, else fall back to role-derived
  defaults (`superAdminPermissions` for super admins, `readOnlyAdminPermissions`
  otherwise).

**Cookie config** (`src/lib/auth/cookies.ts`): the access cookie is short
lived, the refresh cookie is `httpOnly` and `secure` in production. Don't
read or write these cookies by name anywhere except in the auth library.

## 5. UI Conventions

- **shadcn first.** If you need a new primitive (`Dialog`, `DropdownMenu`,
  `Sheet`, `Tabs`, etc.), add it with the shadcn CLI in `new-york` style —
  don't hand-roll it.
- **Compose, don't fork.** Reusable building blocks:
  - `AdminShell` for the page chrome (sidebar, top bar, mobile nav).
  - `PageHeader` for title/breadcrumb/action area.
  - `CursorDataTable` + `TableToolbar` for any tabular data with cursor
    pagination (see `src/components/data-table/`).
  - `ActionDialog` for *every* status change that mutates state.
  - `ConfirmActionDialog` for simple confirms without a reason field.
  - `useCurrentAdmin` (`src/features/auth/use-current-admin.ts`) for the
    logged-in user in client components.
- **Tables** must use cursor pagination. Server returns `cursor`/`nextCursor`
  in the body; `CursorPager` handles the UI.
- **All status mutations** (KYC approve/reject, vendor suspend, refund
  create, promotion publish, settings edits, etc.) must go through
  `ActionDialog`. Rejections must capture and forward a `reason` to the
  backend payload.
- **Toasts** come from `sonner` (`toast.success`, `toast.error`). Don't
  introduce another notification library.
- **Images**: uploaded/clickable images go through
  `components/clickable-image.tsx` and `image-upload-input.tsx`; URLs under
  `/uploads/*` are proxied to the backend in `next.config.ts`.
- **Icons** come from `lucide-react` (shadcn config). Don't import from
  other icon sets.
- **Styling**: prefer `cn(...)` from `src/lib/utils.ts`. Stick to design
  tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`,
  `text-primary-foreground`, `bg-destructive`).
- **Copy**: the UI is in Arabic. Add new strings in Arabic; keep technical
  terms (status codes, API names) in English.

## 6. Data Fetching & React Query

- All read paths: `useQuery` with a key from `src/lib/api/query-keys.ts`.
  Add new keys there; never inline anonymous keys.
- All mutations: `useMutation` with explicit `onSuccess` invalidations of
  the affected query keys, plus a `toast`.
- Never store server data in Zustand. Zustand is for ephemeral UI state
  only.
- Use the `adminApi` wrapper for fetch; do not call `fetch("/api/...")`
  directly in components.

## 7. Forms

- Use `react-hook-form` + `zod` schema + `zodResolver`. Keep schemas
  co-located with the feature, e.g. `features/vendors/schema.ts`.
- Surface field errors next to inputs. Show server errors (`ApiError`) via
  `toast.error` plus an inline banner when relevant.
- Required fields must be marked in the UI **and** enforced in the zod
  schema.

## 8. Permissions in the UI

- Server pages should call `resolveAdminSession()` and, when needed,
  `permissionsForUser`. Forbid with a 403 page if a required permission is
  missing.
- Client components use the `useCurrentAdmin` hook and call `hasPermission`
  to hide/disable actions. Never *only* rely on hiding — the server still
  enforces.

## 9. Adding a New Admin Page (checklist)

1. Create the route under `src/app/(admin)/<area>/<page>/page.tsx`.
2. Use `resolveAdminSession()` to gate access. Redirect to `/login` on
   `status === 401`.
3. Build the page with `<PageHeader>` + `<CursorDataTable>` (or
   domain-specific layout).
4. If the page mutates state, wrap every action in `<ActionDialog>`.
5. For new API surfaces, centralize paths in `src/lib/api/paths.ts` and
   query keys in `query-keys.ts`. Use `withQuery` for query strings.
6. Run `npm run api:types` if the backend OpenAPI changed.
7. Run `npm run lint`, `npm run typecheck`, `npm run build`. If
   user-facing, add a Playwright spec under `tests/e2e/`.

## 10. Backend API Conventions

- Backend is the source of truth for shape. The admin panel mirrors it
  via the BFF; **never** fabricate fields.
- Path constants live in `src/lib/api/paths.ts`. Add new ones there — no
  inline string literals for routes.
- Errors are normalized via `normalizeApiError` (`src/lib/api/errors.ts`)
  into `{ statusCode, code, message, details? }`. Surface `code` for
  branching in the UI when stable.
- If the backend is missing an endpoint, document it in `MISSING_APIS.md`
  with parameters, body shape, priority, and rationale before building a
  client-side workaround.

## 11. Quality Gates (must pass before commit)

```bash
npm run lint
npm run typecheck
npm run build
```

For changes that affect auth, KYC, payments, refunds, or vendor status,
also run the relevant Playwright spec under `tests/e2e/`. Playwright
boots its own dev server on port `3001` (`reuseExistingServer` locally),
so don't fight it — leave the regular dev server on `3005`.

## 12. Common Pitfalls

- **Set state in render/effect.** Some existing components were migrated
  off `useEffect` → setState (see `admin-shell.tsx`, `action-dialog.tsx`).
  If you need to reset state when a prop changes, use the
  `[prevOpen, setPrevOpen]` pattern, not `useEffect`.
- **Don't read tokens in client code.** The access/refresh tokens live in
  httpOnly cookies. Don't try to put them in `localStorage`.
- **Don't bypass `adminApi`.** Going around it loses the auto-refresh-on-401
  behavior and the shared error normalization.
- **Don't call the backend directly from the browser.** It will hit CORS
  *and* leak the access token. Always go through `/api/admin/[...path]`
  or `/api/system/[...path]`.
- **RTL.** Remember the layout is RTL — flex direction, icons in nav,
  table column ordering, and pagination chevrons all need to mirror.
- **Streaming/binary responses.** Use the generic proxy routes; don't try
  to JSON-parse non-JSON upstream responses in the BFF.
- **Next 16 deprecations.** Read `node_modules/next/dist/docs/` for
  anything that smells unfamiliar (cookies(), params, route handlers,
  caching defaults, `fetch` cache options, server actions).
- **Zod v4** has breaking changes vs v3. Don't copy zod snippets from
  older projects without checking the version in `package.json`.

## 13. Testing

- E2E specs live in `tests/e2e/` and are the only tests today. Use
  Playwright's recommended locators (`getByRole`, `getByLabel`,
  `getByText`) and prefer user-visible assertions.
- The Playwright config pins `baseURL` to `http://127.0.0.1:3001` and
  spins up its own dev server there. Don't share port `3005`.
- When adding mocks, use MSW (it's already a devDependency) rather than
  stubbing inside the page under test.

## 14. Related Docs in the Repo

- `ADMIN_PANEL_IMPLEMENTATION_PLAN.md` — the production-readiness plan
  (type fixes, middleware protection, ops UX, missing screens, verification).
- `MISSING_APIS.md` — list of backend endpoints still needed.
- `admin-implementation-plan.md` — earlier planning notes (kept for
  history; defer to `ADMIN_PANEL_IMPLEMENTATION_PLAN.md` for current work).
- `NOON_DATA_ANALYSIS.md`, `NOON_IMPORT_REPORT.md` — one-off data import
  work; read before touching the catalog import flow.

## 15. Working Agreement

- Keep diffs small and focused. Don't refactor unrelated code.
- Mirror the existing folder conventions (route group + `page.tsx`,
  `features/<domain>/<thing>.tsx`, `components/<bucket>/<thing>.tsx`).
- Add or update React Query keys whenever you add a new server read.
- Use existing building blocks (`AdminShell`, `PageHeader`, `CursorDataTable`,
  `ActionDialog`) before introducing new abstractions.
- After any non-trivial change, run `lint` + `typecheck` + `build`. Fix
  what breaks. Don't ship red.
- Don't start a dev server and leave it running — kill it when you're done.
