import { ResolutionCaseDetailPage } from "@/features/resolutions/resolution-detail-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ResolutionDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  await requirePagePermission("orders:write");

  return <ResolutionCaseDetailPage publicId={publicId} />;
}
