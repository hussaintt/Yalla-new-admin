import { ProductDetailPage as ProductDetail } from "@/features/resources/admin-resource-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  await requirePagePermission("products:review");

  return <ProductDetail productId={productId} />;
}
