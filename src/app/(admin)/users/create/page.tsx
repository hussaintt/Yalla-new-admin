import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { CreateAdminUserPage } from "@/features/users/create-admin-user-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function CreateAdminUserRoute() {
  await requirePagePermission("users:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل النموذج" />}>
      <CreateAdminUserPage />
    </Suspense>
  );
}
