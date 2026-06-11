import { OpsGapPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OpsJobsRoute() {
  await requirePagePermission("ops:read");
  return <OpsGapPage title="مهام النظام" description="تشغيل ومتابعة المهام اليدوية عند إضافة endpoints jobs." />;
}
