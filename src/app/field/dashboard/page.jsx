import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  ClipboardIcon,
  ActivityIcon,
  CheckCircleIcon,
  MapPinIcon,
} from "@/components/common/Icons";

import Link from "next/link";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Field Worker Portal | HealthSurvey Portal",
  description: "Field worker operational dashboard for surveys and assignments.",
};

export default async function FieldDashboardPage() {
  const auth = await requireAuth(["field_worker", "superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/field/dashboard");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-3 py-6">
            <h3 className="text-lg font-bold text-rose-800">Access Denied</h3>
            <p className="text-xs text-rose-600">
              Your account does not possess Field Worker privileges.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Field Worker Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Field Operations Portal
              </Badge>
              <span className="text-xs text-teal-300">Phase 06 Active</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Hello, {auth.user.name}
            </h2>
            <p className="text-xs text-slate-300">
              Role: <span className="font-semibold text-teal-400 capitalize">{auth.user.role}</span> • Operational Portal Active
            </p>
          </div>
          <Link href="/field/assignments">
            <Button variant="primary" size="sm" className="flex items-center gap-2 shadow-lg">
              <ClipboardIcon className="w-4 h-4" />
              <span>Open My Assignments</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Field Operations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Survey Execution
              </span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <div className="text-lg font-bold text-slate-900">Bilingual Engine</div>
            <p className="text-[11px] text-slate-500">
              English & Telugu survey forms with real-time conditional logic and drafts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Completion Workflow
              </span>
              <Badge variant="success" size="sm">Direct Complete</Badge>
            </div>
            <div className="text-lg font-bold text-slate-900">Immutable Snapshots</div>
            <p className="text-[11px] text-slate-500">
              Verifiable question text snapshots and atomic task completion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Session Security
              </span>
              <Badge variant="neutral" size="sm">Verified</Badge>
            </div>
            <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 pt-1">
              <CheckCircleIcon className="w-4 h-4" /> Connected & Authorized
            </div>
            <p className="text-[11px] text-slate-500">
              Cryptographically signed session with RBAC isolation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
