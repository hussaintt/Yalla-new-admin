import { EmptyState } from "@/components/state/async-states";
import { BackLink } from "@/components/ui/back-link";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ReviewDetailRoute({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  await requirePagePermission("reviews:moderate");

  return (
    <div className="space-y-4">
      <BackLink href="/reviews">كل المراجعات</BackLink>
      <EmptyState
        title="تفاصيل المراجعة تحتاج endpoint من الخلفية"
        description={`المراجعة ${reviewId} تظهر في قائمة /v1/admin/reviews ويمكن اعتمادها أو رفضها من هناك. لا توجد حاليا GET /v1/admin/reviews/:reviewId لصفحة تفاصيل مستقلة.`}
      />
    </div>
  );
}
