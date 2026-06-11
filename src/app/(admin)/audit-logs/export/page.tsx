import { AuditExportPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AuditExportRoute() {
  await requirePagePermission("audit:read");
  return <AuditExportPage />;
}
