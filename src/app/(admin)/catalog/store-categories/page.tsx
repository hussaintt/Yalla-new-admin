import { CatalogStoreCategoriesPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function CatalogStoreCategoriesRoute() {
  await requirePagePermission("catalog:write");
  return <CatalogStoreCategoriesPage />;
}
