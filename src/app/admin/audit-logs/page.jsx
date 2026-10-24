import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import AuditLogManager from "@/components/admin/AuditLogManager";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { HistoryIcon } from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit & Activity Logs | Superadmin",
  description: "View all administrative actions, worker operations, survey submissions, and cross-module page activity.",
};

export default async function AdminAuditLogsPage() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/audit-logs");
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
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Security & Compliance
              </Badge>
              <span className="text-xs text-slate-300">Audited Activity Trail</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              System Audit & Worker Activity Logs
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Inspect administrative actions, field worker survey drafts and submissions, assignment modifications, and page events across all system modules with verified actor identities.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0 shadow-inner">
            <HistoryIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Interactive Audit & Worker Log Explorer */}
      <AuditLogManager />
    </div>
  );
}
