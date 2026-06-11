# API Specifications - Admin Panel Enhancements

This document details the new advanced endpoints added to `YallaNewBackendV2` to support admin dashboard analytics, notifications, subscriptions, media management, and settings.

---

## 1. Advanced Analytics & Funnel

### 1.1 GET `/v1/admin/analytics/revenue-trends`
Exposes historical revenue trends grouped by day or week.
- **Query Parameters**:
  - `interval`: `'daily'` (default) | `'weekly'`
  - `from`: ISO-8601 Date string (optional)
  - `to`: ISO-8601 Date string (optional)
- **Response**:
  ```json
  {
    "data": [
      {
        "date": "2026-06-01",
        "grossCents": 12050000,
        "payoutCents": 10845000,
        "commissionCents": 1205000
      },
      {
        "date": "2026-06-02",
        "grossCents": 8500000,
        "payoutCents": 7650000,
        "commissionCents": 850000
      }
    ]
  }
  ```

### 1.2 GET `/v1/admin/analytics/funnel`
Returns the checkout and acquisition conversion rates.
- **Response**:
  ```json
  {
    "pageViews": 12470,
    "registrations": 842,
    "cartAdditions": 487,
    "checkoutInitiations": 298,
    "completedOrders": 242
  }
  ```

---

## 2. Direct Vendor Notifications

### 2.1 POST `/v1/admin/vendors/:vendorId/notify`
Sends an push/in-app alert directly to all members (owners and managers) of a specific vendor.
- **Request Body**:
  ```json
  {
    "title": "تنبيه: تحديث وثيقة السجل التجاري",
    "body": "لقد انتهت صلاحية مستند السجل التجاري الخاص بمتجركم. يرجى رفعه مجدداً لتجنب إيقاف الحساب.",
    "data": {
      "action": "open_readiness_checklist"
    }
  }
  ```
- **Response**:
  ```json
  {
    "vendorId": "v_oyko",
    "notifiedUsersCount": 2,
    "success": true
  }
  ```

---

## 3. Subscription Analytics

### 3.1 GET `/v1/admin/subscriptions/stats`
Exposes recurring plan metrics.
- **Response**:
  ```json
  {
    "currency": "EGP",
    "mrrCents": 12500000,
    "activeSubscriptionsCount": 84,
    "trialingCount": 12,
    "pastDueCount": 4,
    "cancelledCount": 6
  }
  ```

### 3.2 GET `/v1/admin/subscriptions/expiring`
Lists subscriptions ending in the next 7 days.
- **Response (CursorPage)**:
  ```json
  {
    "data": [
      {
        "subscriptionId": "sub_01HXX...",
        "vendorId": "v_oyko",
        "vendorName": "Oyko Store",
        "planName": "الباقة الاحترافية",
        "endsAt": "2026-06-15T23:59:59Z",
        "priceCents": 50000,
        "currency": "EGP"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
  ```

---

## 4. Audit Log Diff Analysis

### 4.1 GET `/v1/admin/audit-logs/:logId/diff`
Returns detailed object modification diffs.
- **Response**:
  ```json
  {
    "id": "log_01HXX...",
    "action": "vendor.suspended",
    "actor": {
      "id": "admin_1",
      "email": "admin@yalla.app"
    },
    "targetType": "Vendor",
    "targetId": 12,
    "createdAt": "2026-06-10T09:46:00Z",
    "diff": {
      "previous": {
        "status": "APPROVED"
      },
      "updated": {
        "status": "SUSPENDED",
        "reason": "Policy violation"
      }
    }
  }
  ```

---

## 5. Media & Storage Cleanup

### 5.1 GET `/v1/admin/media/orphans`
Exposes catalog and vendor files that have no active references.
- **Response (CursorPage)**:
  ```json
  {
    "data": [
      {
        "id": "file_01HXX...",
        "filename": "old_logo.png",
        "mimeType": "image/png",
        "sizeBytes": 204850,
        "purpose": "VENDOR_LOGO",
        "createdAt": "2026-05-12T10:00:00Z"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
  ```

### 5.2 DELETE `/v1/admin/media/purge`
Purges all detected orphan files from physical disk and database.
- **Response**:
  ```json
  {
    "purgedCount": 14,
    "spaceSavedBytes": 48270500,
    "success": true
  }
  ```

---

## 6. Global Maintenance Mode

### 6.1 PATCH `/v1/admin/settings/maintenance`
Allows admins to lock or notify platform users dynamically.
- **Request Body**:
  ```json
  {
    "enabled": true,
    "bannerMessage": "المنصة في وضع الصيانة المجدولة حالياً. سنعود للعمل قريباً."
  }
  ```
- **Response**:
  ```json
  {
    "enabled": true,
    "bannerMessage": "المنصة في وضع الصيانة المجدولة حالياً. سنعود للعمل قريباً.",
    "updatedAt": "2026-06-10T14:50:00Z"
  }
  ```

---

## 7. Admin System User Creation

### 7.1 POST `/v1/admin/users`
Creates a new admin system user (for admin panel login/control only).
- **Request Body**:
  ```json
  {
    "firstName": "أحمد",
    "lastName": "علي",
    "email": "ahmed.ali@yalla.app",
    "password": "Password1!",
    "roles": ["ADMIN"]
  }
  ```
- **Response**:
  ```json
  {
    "id": 48,
    "publicId": "usr_01HXX...",
    "email": "ahmed.ali@yalla.app",
    "firstName": "أحمد",
    "lastName": "علي",
    "status": "ACTIVE",
    "createdAt": "2026-06-10T21:15:00Z"
  }
  ```
