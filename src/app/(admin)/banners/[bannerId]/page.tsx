import { BannerDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BannerDetailRoute({
  params,
}: {
  params: Promise<{ bannerId: string }>;
}) {
  const { bannerId } = await params;
  await requirePagePermission("marketing:write");

  return <BannerDetailPage bannerId={bannerId} />;
}
