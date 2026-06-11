import { BrandDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BrandDetailRoute({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  await requirePagePermission("catalog:write");

  return <BrandDetailPage brandId={brandId} />;
}
