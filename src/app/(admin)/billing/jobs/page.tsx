import { BillingGapPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingJobsRoute() {
  await requirePagePermission("billing:write");
  return <BillingGapPage title="مهام فوترة البائعين" />;
}
