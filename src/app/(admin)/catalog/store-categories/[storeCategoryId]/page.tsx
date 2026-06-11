import { StoreCategoryDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function StoreCategoryDetailRoute({
  params,
}: {
  params: Promise<{ storeCategoryId: string }>;
}) {
  const { storeCategoryId } = await params;
  await requirePagePermission("catalog:write");

  return <StoreCategoryDetailPage storeCategoryId={storeCategoryId} />;
}
