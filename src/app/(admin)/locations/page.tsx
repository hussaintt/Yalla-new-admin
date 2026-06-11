import { LocationsPage } from "@/features/locations/locations-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function LocationsRoute() {
  await requirePagePermission("settings:write");
  return <LocationsPage />;
}
