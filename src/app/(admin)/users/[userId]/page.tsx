import { UserDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function UserDetailRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  await requirePagePermission("users:read");

  return <UserDetailPage userId={userId} />;
}
