import { OpsQueuesPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OpsQueuesRoute() {
  await requirePagePermission("ops:read");
  return <OpsQueuesPage />;
}
