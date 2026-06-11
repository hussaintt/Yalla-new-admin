import { OpsGapPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OpsWebhooksRoute() {
  await requirePagePermission("ops:read");
  return <OpsGapPage title="أحداث Webhook" description="متابعة وإعادة محاولة أحداث Webhook عند إضافة endpoints التشغيل." />;
}
