# Missing APIs for YallaNew Admin Panel

The following is a list of backend endpoints that need to be implemented in `YallaNewBackendV2` to enable complete platform operations. Currently, pages corresponding to these features are in a read-only or placeholder state.

---

## 1. Global KYC and Verification Queue

### GET /v1/admin/verifications
* **Method:** GET
* **Query Params:** `status=PENDING|APPROVED|REJECTED`, `limit`, `cursor`, `documentType`
* **Response Body:** `CursorPage<VerificationRow>`
* **Reason Needed:** Let reviewers manage all vendor KYC submissions globally in a single queue, rather than hunting vendor-by-vendor.
* **Priority:** P0

### GET /v1/admin/verifications/:verificationId
* **Method:** GET
* **Response Body:** `VerificationRow`
* **Reason Needed:** View a specific KYC document, images, and history.
* **Priority:** P0

### PATCH /v1/admin/verifications/:verificationId/review
* **Method:** PATCH
* **Request Body:** `{ status: "APPROVED" | "REJECTED", rejectionReason?: string }`
* **Response Body:** `{ success: boolean }`
* **Reason Needed:** Approve or reject a document globally.
* **Priority:** P0

---

## 2. Order Management Actions & Events

### PATCH /v1/admin/orders/:orderId/status
* **Method:** PATCH
* **Request Body:** `{ status: string, notes?: string }`
* **Reason Needed:** Allow operators to manually force order status corrections.
* **Priority:** P0

### POST /v1/admin/orders/:orderId/cancel
* **Method:** POST
* **Request Body:** `{ reason: string }`
* **Reason Needed:** Destructive operator action to cancel orders and log explanations.
* **Priority:** P0

### GET /v1/admin/orders/:orderId/events
* **Method:** GET
* **Response Body:** `{ events: Array<{ id: string, name: string, description: string, createdAt: string }> }`
* **Reason Needed:** Render the chronological timeline audit log for order shipments/cancellations.
* **Priority:** P1

---

## 3. Global Bulk (B2B) Order Controls

### GET /v1/admin/bulk-orders
* **Method:** GET
* **Query Params:** `status`, `limit`, `cursor`
* **Response Body:** `CursorPage<BulkOrder>`
* **Reason Needed:** Audit multi-vendor wholesale requests from B2B buyers.
* **Priority:** P1

---

## 4. Refund Operations

### GET /v1/admin/refunds
* **Method:** GET
* **Query Params:** `status`, `limit`, `cursor`
* **Response Body:** `CursorPage<RefundRow>`
* **Reason Needed:** Global overview of all payments marked for refund.
* **Priority:** P0

### GET /v1/admin/refunds/:refundId
* **Method:** GET
* **Response Body:** `RefundDetail`
* **Reason Needed:** Detail view of gateway transaction references and operator credits.
* **Priority:** P0

---

## 5. Vendor Billing & Invoicing (Global Level)

### GET /v1/admin/vendor-billing/accounts
* **Method:** GET
* **Response Body:** `CursorPage<BillingAccount>`
* **Reason Needed:** Global finance management of commission ledgers.
* **Priority:** P1

### GET /v1/admin/vendor-billing/invoices
* **Method:** GET
* **Response Body:** `CursorPage<BillingInvoice>`
* **Reason Needed:** Audit vendor bills for platform usage.
* **Priority:** P1

---

## 6. Payout Approvals and Bank Details

### GET /v1/admin/payouts
* **Method:** GET
* **Query Params:** `status=PENDING|PAID|FAILED`
* **Response Body:** `CursorPage<PayoutRow>`
* **Reason Needed:** List of vendor payout balance request tickets.
* **Priority:** P0

### POST /v1/admin/payouts/:payoutId/mark-paid
* **Method:** POST
* **Request Body:** `{ transactionReference: string, notes?: string }`
* **Reason Needed:** Mark a sensitive financial payout as successfully dispatched via bank/wallet.
* **Priority:** P0

---

## 7. Audit Details & Export

### GET /v1/admin/audit-logs/:auditLogId
* **Method:** GET
* **Response Body:** `{ id: number, action: string, details: any, actor: any, createdAt: string }`
* **Reason Needed:** Deep inspect raw JSON payloads of administrative actions.
* **Priority:** P2

### GET /v1/admin/audit-logs/export
* **Method:** GET
* **Response Body:** CSV File
* **Reason Needed:** Bulk download audit trail logs for compliance.
* **Priority:** P2

---

## 8. Webhooks & Background Jobs

### GET /v1/admin/ops/webhooks
* **Method:** GET
* **Response Body:** `WebhookEvent[]`
* **Reason Needed:** Diagnostic dashboard to review message queue dispatch logs.
* **Priority:** P2

### POST /v1/admin/ops/jobs/:jobName/run
* **Method:** POST
* **Reason Needed:** Force trigger cron actions manually.
* **Priority:** P2
