import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import BulkImportManager from "@/components/admin/BulkImportManager";
import { Card, CardContent } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bulk Master Data Import | HealthSurvey Operations",
  description: "Bulk import all six master-data modules using a single Excel workbook.",
};

export default async function AdminBulkImportPage() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/bulk-import");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">Bulk Import requires Superadmin privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Page Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Administration</span>
            <span>/</span>
            <span>Master Data</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Bulk Import</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bulk Master Data Import
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Import Projects, Mandals, Facilities, Villages, Stakeholders, and Families with unified single-sheet Excel workbook.
          </p>
        </div>
      </div>

      <BulkImportManager />
    </div>
  );
}
