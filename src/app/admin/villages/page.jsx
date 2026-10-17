import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import VillageManager from "@/components/admin/VillageManager";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPinIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Villages Master | Superadmin",
  description: "Manage villages, habitations, and facility catchment areas.",
};

export default async function AdminVillagesPage() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/villages");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">Requires Superadmin privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Master Data
              </Badge>
              <span className="text-xs text-slate-300">Phase 02</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Village Management
            </h2>
            <p className="text-xs text-slate-300">
              Manage villages and habitations mapped across Project → Mandal → PHC / Facility catchments.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
            <MapPinIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Manager */}
      <VillageManager />
    </div>
  );
}
