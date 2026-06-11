/**
 * Centralized Arabic-only copy for the admin panel.
 *
 * The admin is Arabic-only for now (RTL, no i18n runtime). All user-visible
 * strings should eventually flow through this module so that:
 *   - strings are typed at the call site (autocomplete, refactor safety)
 *   - we have a single grep target when we add English later
 *
 * Keep this file dependency-free. Do not import React, server modules, etc.
 */

export const statusLabels = {
  // Generic
  loading: "جار التحميل",
  empty: "لا توجد بيانات.",
  error: "حدث خطأ غير متوقع.",
  retry: "إعادة المحاولة",
  cancel: "إلغاء",
  save: "حفظ",
  delete: "حذف",
  edit: "تعديل",
  confirm: "تأكيد",
  back: "رجوع",
  next: "التالي",
  prev: "السابق",
  search: "بحث",
  filter: "تصفية",
  export: "تصدير",
  import: "استيراد",
  // Actions
  approve: "اعتماد",
  reject: "رفض",
  suspend: "إيقاف",
  reactivate: "إعادة تنشيط",
  publish: "نشر",
  archive: "أرشفة",
  unarchive: "إلغاء الأرشفة",
  // Audit
  reason: "السبب",
  reasonPlaceholder: "اكتب السبب لظهوره في سجل التدقيق",
  reasonRequired: "السبب مطلوب لهذا الإجراء",
  // Tables
  noResults: "لا توجد نتائج مطابقة",
  rowsPerPage: "صفوف لكل صفحة",
  // Search
  searchPlaceholder: "ابحث…",
  // Empty / loading / error
  emptyStateTitle: "لا توجد بيانات بعد",
  emptyStateDescription: "ستظهر العناصر هنا بمجرد إضافتها.",
} as const;

export const tableStates = {
  loading: "جار تحميل البيانات…",
  errorTitle: "تعذر تحميل البيانات",
  retryButton: "إعادة المحاولة",
} as const;

export const dialogCopy = {
  confirmDeleteTitle: "تأكيد الحذف",
  confirmDeleteDescription: "سيتم حذف هذا العنصر نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
  deleteButton: "حذف",
  reasonLabelForDelete: "سبب الحذف",
} as const;

export const navCopy = {
  dashboard: "لوحة التحكم",
  users: "المستخدمون",
  admins: "المسؤولون",
  customers: "العملاء",
  vendors: "البائعون",
  stores: "المتاجر",
  verifications: "طلبات KYC",
  products: "المنتجات",
  orders: "الطلبات",
  catalog: "الكتالوج",
  promotions: "كوبونات الخصم",
  billing: "العمولات ودورات الفوترة",
  refunds: "الاستردادات",
  shipping: "الشحن والتسويات",
  payments: "سجل المدفوعات",
  subscriptions: "الاشتراكات",
  notifications: "الإشعارات",
  media: "الوسائط والتخزين",
  settings: "إعدادات المنصة",
  auditLogs: "سجل النشاط",
  ops: "صحة النظام",
} as const;

export const sidebarCopy = {
  searchPlaceholder: "بحث في اللوحة…",
  groupCore: "إدارة المستخدمين",
  groupMarket: "التجارة",
  groupFinance: "المالية",
  groupSystem: "النظام",
  ownerLabel: "مالك المنصة",
  logout: "تسجيل الخروج",
  language: "EN",
  unreadNotifications: "إشعار غير مقروء",
  unreadMessages: "رسائل غير مقروءة",
} as const;

export const dashboardCopy = {
  welcomePrefix: "أهلاً",
  welcomeDefault: "صاحب المنصة",
  welcomeSubtitle: "نظرة شاملة على أداء منصة يلا نيو",
  liveLabel: "مباشر",
} as const;

export const errorCopy = {
  notFound: "الصفحة غير موجودة.",
  forbidden: "ليست لديك صلاحية لعرض هذه الصفحة.",
  sessionExpired: "انتهت الجلسة — يرجى تسجيل الدخول مجدداً",
  csrfBlocked: "تم رفض الطلب لأسباب أمنية (CSRF).",
  network: "تعذر الاتصال بالخادم. حاول مجدداً.",
  generic: "حدث خطأ غير متوقع. حاول مجدداً.",
} as const;

export const successCopy = {
  saved: "تم الحفظ بنجاح",
  deleted: "تم الحذف بنجاح",
  updated: "تم التحديث بنجاح",
  created: "تم الإنشاء بنجاح",
  exported: "تم تنزيل الملف",
} as const;

export const formCopy = {
  required: "هذا الحقل مطلوب",
  invalidEmail: "بريد إلكتروني غير صالح",
  passwordTooShort: "8 أحرف على الأقل",
  passwordNeedsUppercase: "حرف كبير واحد على الأقل",
  passwordNeedsNumber: "رقم واحد على الأقل",
} as const;

export const tableHeaderCopy = {
  actions: "إجراءات",
  status: "الحالة",
  created: "تاريخ الإنشاء",
  updated: "تاريخ التحديث",
} as const;
