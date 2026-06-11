import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-2xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
      >
        تخطي إلى المحتوى الرئيسي
      </a>
      <AdminShell>{children}</AdminShell>
    </>
  );
}
