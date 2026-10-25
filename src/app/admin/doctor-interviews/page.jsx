import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import DoctorInterviewManager from "@/components/admin/DoctorInterviewManager";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { StethoscopeIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Doctor Clinical Interviews | Superadmin Operations",
  description: "Independent doctor clinical interviews, questionnaire administration, and family patient associations.",
};

export default async function AdminDoctorInterviewsPage() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/doctor-interviews");
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
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6 text-white shadow-xl border border-blue-900/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Clinical Operations
              </Badge>
              <span className="text-xs text-blue-200">Independent Doctor Module</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Doctor Clinical Interviews
            </h2>
            <p className="text-xs text-slate-300">
              Record doctor consultations, evaluate medicine availability and delivery impact, and link relevant family records.
            </p>
          </div>
          <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0">
            <StethoscopeIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Manager Component */}
      <DoctorInterviewManager userRole="superadmin" />
    </div>
  );
}
