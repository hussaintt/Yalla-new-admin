import { AuditLogDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AuditLogDetailRoute({
  params,
}: {
  params: Promise<{ auditLogId: string }>;
}) {
  const { auditLogId } = await params;
  await requirePagePermission("audit:read");

  return <AuditLogDetailPage auditLogId={auditLogId} />;
}
