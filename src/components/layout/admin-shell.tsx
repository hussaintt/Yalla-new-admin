"use client";

import {
  BadgeDollarSign,
  Boxes,
  ClipboardCheck,
  FileClock,
  Globe,
  Home,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TicketPercent,
  Truck,
  Undo2,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import { useSidebarCounts } from "@/features/dashboard/sidebar-counts";
import { ApiError } from "@/lib/api/errors";
import {
  hasPermission,
  isModeratorUser,
  permissionsForUser,
  type AdminPermission,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  permission?: AdminPermission;
  group: "core" | "market" | "finance" | "system";
  countKey?: "vendors" | "verifications" | "vendorEdits" | "products" | "orders" | "billing";
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", description: "المؤشرات اليومية", icon: Home, permission: "dashboard:read", group: "core" },
  { href: "/admins", label: "المسؤولون", description: "الأدوار والصلاحيات", icon: Users, permission: "users:read", group: "core" },
  { href: "/customers", label: "العملاء", description: "حسابات عملاء المنصة", icon: Users, permission: "users:read", group: "core" },
  { href: "/vendors", label: "البائعون", description: "حسابات البائعين", icon: Warehouse, permission: "vendors:read", group: "core" },
  { href: "/stores", label: "المتاجر", description: "الإدارة والاعتماد والتحقق", icon: Store, permission: "stores:read", group: "core", countKey: "vendors" },
  { href: "/store-edits", label: "تعديلات المتاجر", description: "مراجعة تعديلات بيانات المتجر", icon: Store, permission: "stores:read", group: "core", countKey: "vendorEdits" },
  { href: "/verifications", label: "طلبات KYC", description: "مراجعة الوثائق", icon: ShieldCheck, permission: "kyc:review", group: "core", countKey: "verifications" },
  { href: "/products", label: "المنتجات", description: "الحالة والمحتوى", icon: PackageSearch, permission: "products:review", group: "market", countKey: "products" },
  { href: "/orders", label: "الطلبات", description: "البيع والتسليم", icon: ShoppingBag, permission: "orders:read", group: "market", countKey: "orders" },
  { href: "/catalog", label: "الكتالوج", description: "الفئات والعلامات التجارية", icon: Boxes, permission: "catalog:write", group: "market" },
  { href: "/banners", label: "البانرات الإعلانية", description: "إدارة بنرات العروض والصفحة الرئيسية", icon: Sparkles, permission: "marketing:write", group: "market" },
  { href: "/promotions", label: "كوبونات الخصم", description: "إنشاء وإدارة كوبونات الخصم", icon: TicketPercent, permission: "marketing:write", group: "market" },
  { href: "/ai-studio", label: "استوديو الذكاء الاصطناعي", description: "استهلاك تحسين الصور والحصص", icon: Sparkles, permission: "settings:write", group: "market" },
  { href: "/resolutions", label: "الإرجاع والنزاعات", description: "مراجعة طلبات الإرجاع والشكاوى", icon: Undo2, permission: "orders:write", group: "market" },
  { href: "/refunds", label: "الاستردادات", description: "المراجعة والاعتماد", icon: ReceiptText, permission: "refunds:write", group: "finance" },
  { href: "/shipping", label: "الشحن والتسويات", description: "المناطق والأسعار", icon: Truck, permission: "settings:write", group: "finance" },
  { href: "/payments", label: "سجل المدفوعات", description: "الحركات المالية", icon: BadgeDollarSign, permission: "payments:read", group: "finance" },
  { href: "/settings", label: "إعدادات المنصة", description: "الضبط العام", icon: Boxes, permission: "settings:write", group: "system" },
  { href: "/locations", label: "المواقع الجغرافية", description: "الدول والمدن والمناطق", icon: Globe, permission: "settings:write", group: "system" },
  { href: "/audit-logs", label: "سجل النشاط", description: "أثر العمليات", icon: FileClock, permission: "audit:read", group: "system" },
  { href: "/ops", label: "صحة النظام", description: "المراقبة والتشغيل", icon: ClipboardCheck, permission: "ops:read", group: "system" },
];

// Reimport Warehouse icon separately if it was missing from original import destructured lists (wait, Warehouse is imported!)
import { Warehouse } from "lucide-react";

const groupLabels = {
  core: "إدارة المستخدمين",
  market: "التجارة",
  finance: "المالية",
  system: "النظام",
} satisfies Record<NavItem["group"], string>;

const groupOrder: NavItem["group"][] = ["core", "market", "finance", "system"];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname.startsWith("/dashboard");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  pathname,
  items,
  counts,
  countsLoading,
  onNavigate,
}: {
  pathname: string;
  items: NavItem[];
  counts: Partial<Record<NonNullable<NavItem["countKey"]>, number>>;
  countsLoading: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col text-[#c9eae6]">
      <div className="border-b border-white/10 px-5 pb-5 pt-6">
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white p-1.5 shadow-lg shadow-brand-teal-600/10">
            <Image
              src="/logo.webp"
              alt="Yalla New Logo"
              width={48}
              height={48}
              priority
              className="h-full w-auto object-contain"
            />
          </div>
          <div>
            <div className="text-[18px] font-extrabold leading-tight tracking-tight text-white">
              يلا نيو
            </div>
            <div className="mt-0.5 text-[11px] text-[#94d9d2]">لوحة تحكم الإدارة</div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-5 scrollbar-thin">
        <nav className="space-y-4 pb-2 pe-1">
          {groupOrder.map((group) => {
            const groupItems = items.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;
            return (
              <section key={group} className="px-2">
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.8px] text-[#6fbdb6]">
                  {groupLabels[group]}
                </div>
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[#c9eae6] transition",
                          "hover:bg-white/5 hover:text-white",
                          active &&
                          "bg-gradient-to-l from-brand-teal-600 to-brand-teal-500 text-white shadow-lg shadow-brand-teal-600/30 hover:bg-gradient-to-l",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.countKey ? (
                          countsLoading || counts[item.countKey] == null ? (
                            <span
                              className="inline-block h-3 w-6 animate-pulse rounded-full bg-white/15"
                              aria-label="جار التحميل"
                            />
                          ) : (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-white/10 text-[#94d9d2]",
                              )}
                            >
                              {new Intl.NumberFormat("ar-EG-u-nu-latn").format(
                                counts[item.countKey] ?? 0,
                              )}
                            </span>
                          )
                        ) : null}
                        {active ? (
                          <span
                            aria-hidden
                            className="absolute -end-3 top-2 bottom-2 w-1 rounded bg-brand-orange"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: admin, error, isLoading } = useCurrentAdmin();
  const { data: countsData, isLoading: countsLoading } = useSidebarCounts();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const displayName = admin?.fullName ?? admin?.name ?? admin?.email ?? "مسؤول";
  const isModerator = isModeratorUser(admin);
  const roleLabel = isModerator ? "مشرف • صلاحيات محدودة" : "مالك المنصة • صلاحيات كاملة";
  const permissionCount = permissionsForUser(admin).length;

  useEffect(() => {
    if (error instanceof ApiError && error.statusCode === 401) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [error, pathname, router]);

  const visibleNavItems = useMemo(() => {
    if (!admin) return navItems;
    return navItems.filter(
      (item) => !item.permission || hasPermission(admin, item.permission),
    );
  }, [admin]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("تم تسجيل الخروج");
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        dir="rtl"
        className="fixed inset-y-0 right-0 z-30 hidden w-[280px] overflow-hidden border-l border-white/5 bg-gradient-to-b from-sidebar-bg-from via-sidebar-bg-mid to-sidebar-bg-to text-[#c9eae6] shadow-[-4px_0_24px_rgba(15,61,58,0.15)] lg:block"
      >
        <SidebarContent
          pathname={pathname}
          items={visibleNavItems.filter((item) => item.href !== "/settings")}
          counts={countsData ?? {}}
          countsLoading={countsLoading}
        />
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-gradient-to-t from-sidebar-bg-to/95 to-transparent p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-teal-600 to-brand-orange text-sm font-extrabold text-white">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white">
                {displayName}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[#94d9d2]">
                {roleLabel}
              </div>
            </div>
            <span className="size-2 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
          </div>
        </div>
      </aside>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside
            dir="rtl"
            className="absolute inset-y-0 right-0 w-[86vw] max-w-sm overflow-hidden border-l border-white/10 bg-gradient-to-b from-sidebar-bg-from via-sidebar-bg-mid to-sidebar-bg-to text-[#c9eae6] shadow-2xl"
          >
            <div className="absolute left-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="grid size-10 place-items-center rounded-full bg-white/10 text-white"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              items={visibleNavItems.filter((item) => item.href !== "/settings")}
              counts={countsData ?? {}}
              countsLoading={countsLoading}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pr-[280px]">
        <header className="sticky top-0 z-20 border-b border-border bg-card px-8 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-ink-muted shadow-sm"
                aria-label="فتح القائمة"
              >
                <Menu className="size-5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-extrabold text-ink-strong">
                لوحة التحكم
              </h1>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isLoading
                  ? "جار التحقق من الجلسة..."
                  : `نظرة شاملة على أداء منصة يلا نيو — ${arabicToday()}`}
              </p>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl py-1 ps-1 pe-2.5 transition hover:bg-muted">
              <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-orange text-[13px] font-extrabold text-white">
                {initials(displayName)}
              </div>
              <div className="hidden text-right md:block">
                <div className="text-[13px] font-bold text-ink">{displayName}</div>
                <div className="text-[11px] text-ink-muted">{isModerator ? "مشرف" : "المالك"}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden h-9 items-center gap-1.5 rounded-2xl border border-border bg-card px-3 text-xs font-bold text-ink-muted shadow-sm transition hover:-translate-y-0.5 hover:bg-muted sm:inline-flex"
                title="تسجيل الخروج"
              >
                <LogOut className="size-3.5" />
                خروج
              </button>
            </div>
          </div>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="px-4 pb-8 pt-2 text-center text-xs text-ink-soft lg:px-8">
          لوحة تحكم إدارة منصة يلا نيو • الإصدار 2.4.1 • آخر تحديث: {arabicToday()}
          {" — "}
          {arabicNow()}
        </footer>
      </div>

      <div className="sr-only" aria-live="polite">
        {permissionCount} صلاحية متاحة
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function arabicToday() {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function arabicNow() {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}
