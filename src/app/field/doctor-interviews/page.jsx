import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DoctorInterviewManager from "@/components/admin/DoctorInterviewManager";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { StethoscopeIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Doctor Interviews | Field Worker Operations",
  description: "Conduct independent doctor interviews, capture clinical responses, and link catchment families.",
};

export default async function FieldDoctorInterviewsPage() {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/field/doctor-interviews");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">Requires Field Worker or Superadmin privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 p-4 sm:p-6 text-white shadow-xl border border-emerald-900/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                Field Operations
              </Badge>
              <span className="text-xs text-emerald-200">PHC / CHC Doctor Workflow</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Doctor Clinical Interviews
            </h2>
            <p className="text-xs text-slate-300">
              Conduct interviews with Medical Officers, capture clinical feedback, and associate catchment families.
            </p>
          </div>
          <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
            <StethoscopeIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Manager Component */}
      <DoctorInterviewManager userRole="field_worker" />
    </div>
  );
}
