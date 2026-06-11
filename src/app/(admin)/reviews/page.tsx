import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import ReviewsPage from "@/features/reviews/reviews-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ReviewsRoute() {
  await requirePagePermission("reviews:moderate");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المراجعات" />}>
      <ReviewsPage />
    </Suspense>
  );
}
