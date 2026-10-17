import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import FieldAssignmentList from "@/components/field/FieldAssignmentList";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPinIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Field Assignments | Field Worker Portal",
  description: "View and execute assigned household health impact surveys and tasks.",
};

export default async function FieldAssignmentsPage() {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/field/assignments");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">Requires Field Worker privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Field Operations
              </Badge>
              <span className="text-xs text-teal-300">Phase 05 Active</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              My Field Assignments
            </h2>
            <p className="text-xs text-slate-300">
              Household surveys, village rounds, and scheduled field interviews dispatched to your account.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-400">
            <MapPinIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Field Worker Assignment List */}
      <FieldAssignmentList />
    </div>
  );
}
