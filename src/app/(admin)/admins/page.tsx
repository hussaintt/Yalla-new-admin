import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import UsersPage from "@/features/users/users-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function UsersRoute() {
  await requirePagePermission("users:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المستخدمين" />}>
      <UsersPage />
    </Suspense>
  );
}
