import { BillingGapPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingOverviewRoute() {
  await requirePagePermission("billing:write");
  return <BillingGapPage title="نظرة عامة على فواتير البائعين" />;
}
