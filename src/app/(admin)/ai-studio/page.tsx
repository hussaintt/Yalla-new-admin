import { Suspense } from "react";

import { AiStudioPage } from "@/features/ai-studio/ai-studio-page";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AiStudioRoute() {
  await requirePagePermission("settings:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل استوديو الذكاء الاصطناعي" />}>
      <AiStudioPage />
    </Suspense>
  );
}
