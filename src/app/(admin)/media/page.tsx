import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { MediaPage } from "@/features/media/media-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function MediaRoute() {
  await requirePagePermission("media:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الوسائط" />}>
      <MediaPage />
    </Suspense>
  );
}
