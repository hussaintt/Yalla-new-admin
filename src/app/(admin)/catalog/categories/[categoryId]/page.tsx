import { CategoryDetailPage } from "@/features/resources/admin-resource-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function CategoryDetailRoute({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  await requirePagePermission("catalog:write");

  return <CategoryDetailPage categoryId={categoryId} />;
}
