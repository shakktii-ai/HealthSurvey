import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import SurveyResponseInspector from "@/components/admin/SurveyResponseInspector";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ClipboardIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inspect Survey Submission | Superadmin | HealthSurvey Portal",
  description: "Response-level inspection, revision history, and audited post-submission corrections.",
};

export default async function AdminSurveyResponseDetailPage({ params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/survey-responses");
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

  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Survey Inspection & Audit
              </Badge>
              <span className="text-xs text-emerald-300">Phase 07 Active</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Response Inspection & Corrections
            </h2>
            <p className="text-xs text-slate-300">
              Audit recorded responses, evaluate revision histories, toggle sensitive PII reveals, and apply audited amendments.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
            <ClipboardIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Inspector Component */}
      <SurveyResponseInspector responseId={id} />
    </div>
  );
}
