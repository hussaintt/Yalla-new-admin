import { OpsHealthPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OpsHealthRoute() {
  await requirePagePermission("ops:read");
  return <OpsHealthPage />;
}
