import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DataQualityManager from "@/components/admin/DataQualityManager";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ShieldCheckIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Quality Engine | Superadmin | HealthSurvey Portal",
  description: "Automated scan engine, integrity checks, and issue tracking across survey submissions.",
};

export default async function AdminDataQualityPage() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/data-quality");
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
                Quality Assurance Engine
              </Badge>
              <span className="text-xs text-emerald-300">Phase 07 Active</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Data Quality & Anomaly Detection
            </h2>
            <p className="text-xs text-slate-300">
              Run repeatable bounded scans to audit survey completeness, identify logic discrepancies, and manage issue resolution lifecycles.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Data Quality Manager */}
      <DataQualityManager />
    </div>
  );
}
