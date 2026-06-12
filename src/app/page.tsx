import { redirect } from "next/navigation";

import { resolveAdminSession } from "@/lib/auth/server-session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function Home() {
  const session = await resolveAdminSession();

  if (!session.ok) {
    redirect("/login");
  }

  if (hasPermission(session.user, "dashboard:read")) {
    redirect("/dashboard");
  }

  if (hasPermission(session.user, "marketing:write")) {
    redirect("/banners");
  }

  if (hasPermission(session.user, "kyc:review")) {
    redirect("/verifications");
  }

  redirect("/dashboard");
}
