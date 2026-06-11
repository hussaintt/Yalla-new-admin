# YallaNew Admin Panel Implementation Plan

This document outlines the architectural fixes, operational enhancements, and quality checks required to transform the prototype admin panel into a production-ready, safe, and efficient operations tool.

## 1. Quality & Type Safety Fixes (Immediate priority)

We will resolve compiler and linter errors to enable successful building:

* **TypeScript Narrowing issue in `server-session.ts`:**
  * **File:** [permissions.ts](file:///Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewAdmin/src/lib/auth/permissions.ts)
  * **Fix:** Update `isAdminUser` to act as a TypeScript type guard (`user is AdminUser`) so that the compiler correctly refines `user` to be non-nullable after checking `isAdminUser(user)`.
* **Linting errors (calling `setState` synchronously within `useEffect`):**
  * **File:** [admin-shell.tsx](file:///Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewAdmin/src/components/layout/admin-shell.tsx)
    * **Fix:** Close the mobile navigation bar directly in click handlers and remove the `useEffect` listening to `pathname`.
  * **File:** [action-dialog.tsx](file:///Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewAdmin/src/components/modals/action-dialog.tsx)
    * **Fix:** Reset the `reason` state in render phase when `open` changes from true to false by using the React state-adjustment pattern (previous props state tracking) instead of `useEffect`.

---

## 2. Authentication and Security Enforcement

* **Middleware Protection:**
  * **New File:** `src/middleware.ts`
  * **Implementation:** Intercept all routes except `/login`, `/api/auth/login`, and static assets. If the `yalla_admin_session` and `yalla_admin_refresh` cookies are absent, redirect directly to `/login`. This protects the admin pages server-side and prevents UI layout flashes.

---

## 3. Operations & UI/UX Improvements

We will convert resource lists and placeholders into a real, functional operations system:

### A. Safe Vendor Approval on Details Page
* **File:** [vendor-detail-page.tsx](file:///Users/hussiennouh/Desktop/WORK/AI/YallaNew/YallaNewProduction/YallaNewAdmin/src/features/vendors/vendor-detail-page.tsx)
* **Enhancement:** Add actions directly to the detail view to Approve, Reject (with reason), or Suspend the vendor, utilizing the safe `ActionDialog` wrapper. Surfacing notes, members, and status controls in one unified interface.

### B. Table Search & Filtering Extensions
* **Enhancements:** Modify tables (`orders`, `products`, `users`, `vendors`, `verifications`, `payments`) to support active client-side and API query filtering:
  * Proper search debouncing.
  * Status and category selectors.
  * Mobile responsive scroll wrappers.

### C. Safe Action Confirmation & Rejection Reasons
* **Enforce:** All status changes (KYC approval/rejection, vendor status, product publishing, payout approvals, settings edits, refund creation) must wrap around `ActionDialog`.
* **Reason Capture:** Capture and send reasons for all rejection actions (`REJECTED` status) to backend payloads, logging notifications.

---

## 4. Feature Coverage & Missing Screens

We will create pages for sections currently stubbed out:

* **Payout requests and payout history:** Provide payout management tables and bank details fields.
* **Support tickets and disputes:** Create a ticket listings and conversations view under `/support` with priority and status filters.
* **Reviews and content moderation:** Allow moderating product descriptions, store details, and reporting.

---

## 5. Backend Integrations & API Centralization

We will audit all routes for hardcoded strings and centralize them. If a backend endpoint is missing, we will document it in `MISSING_APIS.md` with parameters, body, priority, and rationale.

---

## 6. Verification Plan

We will run:
1. `npm run lint` to confirm zero style issues.
2. `npm run typecheck` to confirm zero TS issues.
3. `npm run build` to verify Next.js production builds.
