import { notFound } from "next/navigation";

import { PaymentProvidersPage } from "@/features/settings/payment-providers-page";
import { isSuperAdminUser } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PaymentProvidersRoute() {
  const admin = await requirePagePermission("settings:write");
  if (!isSuperAdminUser(admin)) notFound();
  return <PaymentProvidersPage />;
}
