import { CommissionRatesPage } from "@/features/billing/commission-rates-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function CommissionRatesRoute() {
  await requirePagePermission("billing:write");
  return <CommissionRatesPage />;
}
