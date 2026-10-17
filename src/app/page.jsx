import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/services/dashboardService";
import OperationalDashboardView from "@/components/admin/OperationalDashboardView";
import {
  ShieldCheckIcon,
  UsersIcon,
  BarChartIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ServerIcon,
  DatabaseIcon,
} from "@/components/common/Icons";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HealthSurvey Operations Portal",
  description: "Enterprise operations and survey management system.",
};

export default async function HomePage() {
  const user = await getSessionUser();

  let dashboardData = null;
  if (user?.role === "superadmin") {
    try {
      dashboardData = await getDashboardMetrics();
    } catch (err) {
      console.error("Failed to load dashboard data on overview:", err);
    }
  }

  // If authenticated as superadmin, render the full operational dashboard
  if (user?.role === "superadmin" && dashboardData) {
    return (
      <div className="space-y-6">
        <OperationalDashboardView data={dashboardData} />
      </div>
    );
  }

  // If authenticated as field worker, render worker portal overview
  if (user?.role === "field_worker") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Field Worker Portal</h1>
              <p className="text-xs text-slate-500">Welcome back, {user.name} ({user.email})</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You are authenticated as an authorized field enumerator. Access your allocated household assignments and complete survey protocols.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link href="/field/assignments">
              <Button variant="primary" size="md">
                <span>View My Field Assignments</span>
                <ArrowRightIcon className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/field/dashboard">
              <Button variant="outline" size="md">
                <span>Field Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated as donor, render donor portal overview
  if (user?.role === "donor") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <BarChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Donor Impact Observatory</h1>
              <p className="text-xs text-slate-500">Welcome, {user.name} ({user.email})</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You have access to authorized project impact analytics, survey completion metrics, and population coverage data (PII-protected).
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link href="/donor/dashboard">
              <Button variant="primary" size="md">
                <span>Open Impact Dashboard</span>
                <ArrowRightIcon className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/donor/reports">
              <Button variant="outline" size="md">
                <span>Report Center</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated / Enterprise Gateway
  return (
    <div className="space-y-6 py-2">
      {/* Enterprise Title Bar (No marketing hero) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            HealthSurvey Enterprise Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Family Verification & Health Impact Survey Management System
          </p>
        </div>
        <div>
          <Link href="/login">
            <Button variant="primary" size="md">
              <span>Sign In to System</span>
              <ArrowRightIcon className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Role Access Portals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Authorized System Portals</h2>
          <span className="text-xs text-slate-400">Select your designated workspace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Superadmin
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Superadmin Control Center</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Master data governance, survey round configuration, field assignment engine, and user role management.
              </p>
            </div>
            <Link href="/login?callbackUrl=/admin/dashboard" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Access Superadmin</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Field Worker
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Field Worker Portal</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Household verification, informed consent, offline-first draft saves, and bilingual survey execution.
              </p>
            </div>
            <Link href="/login?callbackUrl=/field/assignments" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Access Field Portal</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <BarChartIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Donor
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Donor Observatory</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Project-isolated coverage reports, multi-round impact comparisons, and privacy-protected analytics.
              </p>
            </div>
            <Link href="/login?callbackUrl=/donor/dashboard" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Access Donor Observatory</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Security & System Architecture Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Security & Access Safeguards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block">HTTP-Only Signed Cookies</span>
              <span className="text-[11px] text-slate-500">HMAC-SHA256 session tokens</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block">Strict RBAC Enforcement</span>
              <span className="text-[11px] text-slate-500">Superadmin, Field, and Donor isolation</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block">PII Protection Protocols</span>
              <span className="text-[11px] text-slate-500">Household phone & name masking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
