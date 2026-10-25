"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardIcon,
  UsersIcon,
  ClipboardIcon,
  ActivityIcon,
  MapPinIcon,
  BarChartIcon,
  CloseIcon,
  ShieldCheckIcon,
  LogOutIcon,
  FolderIcon,
  BuildingIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  CalendarIcon,
  UploadIcon,
  HistoryIcon,
  StethoscopeIcon,
} from "@/components/common/Icons";

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const masterDataNav = [
    { name: "Projects", href: "/admin/projects", icon: FolderIcon },
    { name: "Mandals", href: "/admin/mandals", icon: MapPinIcon },
    { name: "PHC / Facilities", href: "/admin/facilities", icon: BuildingIcon },
    { name: "Villages", href: "/admin/villages", icon: ActivityIcon },
    { name: "Stakeholders", href: "/admin/stakeholders", icon: UsersIcon },
    { name: "Families", href: "/admin/families", icon: HomeIcon },
    { name: "Doctor Interviews", href: "/admin/doctor-interviews", icon: StethoscopeIcon },
    { name: "Bulk Excel Import", href: "/admin/bulk-import", icon: UploadIcon },
    { name: "Question Bank", href: "/admin/question-bank", icon: QuestionMarkCircleIcon },
    { name: "Survey Rounds", href: "/admin/survey-rounds", icon: CalendarIcon },
    { name: "Field Assignments", href: "/admin/assignments", icon: ClipboardIcon },
    { name: "Survey Monitoring", href: "/admin/survey-monitoring", icon: BarChartIcon },
    { name: "Data Quality", href: "/admin/data-quality", icon: ShieldCheckIcon },
    { name: "Survey Responses", href: "/admin/survey-responses", icon: ClipboardIcon },
    { name: "Donor Access", href: "/admin/donor-access", icon: UsersIcon },
    { name: "Audit & Activity Logs", href: "/admin/audit-logs", icon: HistoryIcon },
  ];

  const isSuperadmin = currentUser?.role === "superadmin";
  const isFieldWorker = currentUser?.role === "field_worker";
  const isDonor = currentUser?.role === "donor";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation sidebar"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClose();
          }}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-tight">
                HealthSurvey
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Enterprise Operations
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-5">
          {/* Section 1: Core Navigation */}
          <div>
            <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <nav className="space-y-0.5">
              {/* Overview */}
              <Link
                href="/"
                onClick={onClose}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  pathname === "/"
                    ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <DashboardIcon className={`w-4 h-4 shrink-0 ${pathname === "/" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Overview</span>
              </Link>

              {/* Superadmin Portal */}
              {isSuperadmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                    pathname === "/admin/dashboard"
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheckIcon className={`w-4 h-4 shrink-0 ${pathname === "/admin/dashboard" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Superadmin Portal</span>
                </Link>
              )}

              {/* Field Worker Portal */}
              {isFieldWorker && (
                <Link
                  href="/field/dashboard"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                    pathname === "/field/dashboard"
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <UsersIcon className={`w-4 h-4 shrink-0 ${pathname === "/field/dashboard" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Field Worker Portal</span>
                </Link>
              )}

              {/* Donor Portal */}
              {isDonor && (
                <Link
                  href="/donor/dashboard"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                    pathname === "/donor/dashboard"
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BarChartIcon className={`w-4 h-4 shrink-0 ${pathname === "/donor/dashboard" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Donor Observatory</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Section 2: Superadmin Master Data & Families */}
          {isSuperadmin && (
            <div>
              <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Master Data & Families
              </div>
              <nav className="space-y-0.5">
                {masterDataNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Section 3: Field Operations (for Field Workers) */}
          {isFieldWorker && (
            <div>
              <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Field Operations
              </div>
              <nav className="space-y-0.5">
                <Link
                  href="/field/assignments"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-colors ${
                    pathname === "/field/assignments" || pathname.startsWith("/field/survey") || pathname.startsWith("/field/workflow")
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <MapPinIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>My Field Assignments</span>
                </Link>
                <Link
                  href="/field/doctor-interviews"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-colors ${
                    pathname.startsWith("/field/doctor-interviews")
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <StethoscopeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Doctor Interviews</span>
                </Link>
              </nav>
            </div>
          )}

          {/* Section 4: Donor Analytics (for Donors) */}
          {isDonor && (
            <div>
              <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reports & Impact
              </div>
              <nav className="space-y-0.5">
                <Link
                  href="/donor/reports"
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-colors ${
                    pathname === "/donor/reports"
                      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <BarChartIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Report Center</span>
                </Link>
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-3.5 bg-slate-50/70">
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold capitalize truncate">
                  {currentUser.role.replace("_", " ")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Not signed in</span>
              <Link
                href="/login"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sign In &rarr;
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
