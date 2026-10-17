import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getDashboardMetrics } from "@/services/dashboardService";
import UserManager from "@/components/admin/UserManager";
import OperationalDashboardView from "@/components/admin/OperationalDashboardView";
import {
  FolderIcon,
  MapPinIcon,
  BuildingIcon,
  UsersIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  CalendarIcon,
  ActivityIcon,
} from "@/components/common/Icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Superadmin Control Center",
  description: "Operational dashboard for survey monitoring, master data, and user administration.",
};

export default async function AdminDashboardPage() {
  const auth = await requireAuth(["superadmin"]);

  if (!auth.authenticated) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  if (!auth.authorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 space-y-2">
          <h3 className="text-base font-bold text-rose-800">Access Denied</h3>
          <p className="text-xs text-rose-600">
            Your account does not possess Superadmin privileges.
          </p>
        </div>
      </div>
    );
  }

  let dashboardData = null;
  try {
    dashboardData = await getDashboardMetrics();
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  const masterDirectories = [
    { name: "Projects", count: dashboardData?.summary?.totalProjects ?? 0, href: "/admin/projects", icon: FolderIcon, desc: "Survey initiatives & timelines" },
    { name: "Mandals", count: dashboardData?.summary?.masterData?.mandals ?? 0, href: "/admin/mandals", icon: MapPinIcon, desc: "Administrative blocks" },
    { name: "Facilities", count: dashboardData?.summary?.masterData?.facilities ?? 0, href: "/admin/facilities", icon: BuildingIcon, desc: "PHCs & Area hospitals" },
    { name: "Villages", count: dashboardData?.summary?.totalVillages ?? 0, href: "/admin/villages", icon: ActivityIcon, desc: "Habitations & catchments" },
    { name: "Stakeholders", count: dashboardData?.summary?.masterData?.stakeholders ?? 0, href: "/admin/stakeholders", icon: UsersIcon, desc: "ASHAs, Staff & Officials" },
    { name: "Families", count: dashboardData?.summary?.totalFamilies ?? 0, href: "/admin/families", icon: HomeIcon, desc: "Registered households" },
    { name: "Question Bank", count: dashboardData?.summary?.masterData?.questionsTotal ?? 0, href: "/admin/question-bank", icon: QuestionMarkCircleIcon, desc: "Bilingual questionnaires" },
    { name: "Survey Rounds", count: dashboardData?.summary?.activeSurveyRounds ?? 0, href: "/admin/survey-rounds", icon: CalendarIcon, desc: "Protocol milestones" },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Real Operational Dashboard View */}
      {dashboardData ? (
        <OperationalDashboardView data={dashboardData} />
      ) : (
        <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          Loading operational metrics...
        </div>
      )}

      {/* 2. Master Data Management Directories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data & Catchment Hierarchy</h2>
            <p className="text-xs text-slate-500">Geographic infrastructure, health facilities, and questionnaire assets</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {masterDirectories.map((dir) => {
            const Icon = dir.icon;
            return (
              <Link
                key={dir.name}
                href={dir.href}
                className="group p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 group-hover:text-emerald-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {dir.count}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                  {dir.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{dir.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. User Administration & Access Control (Superadmin feature) */}
      <div id="users-section" className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Administration & Role Delegation</h2>
            <p className="text-xs text-slate-500">Manage field workers, donors, and administrative accounts</p>
          </div>
        </div>

        <UserManager currentUser={auth.user} />
      </div>
    </div>
  );
}
