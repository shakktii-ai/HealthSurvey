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

/**
 * Superadmin Navigation Configuration
 * Divided into EXACTLY 4 sections in the required order.
 */
export const SUPERADMIN_SECTIONS = [
  {
    id: "section-01",
    heading: "SECTION 01 — PROJECT & MASTER DATA",
    items: [
      { name: "Projects", href: "/admin/projects", icon: FolderIcon },
      { name: "Mandals", href: "/admin/mandals", icon: MapPinIcon },
      { name: "PHC / Facilities", href: "/admin/facilities", icon: BuildingIcon },
      { name: "Villages", href: "/admin/villages", icon: ActivityIcon },
      { name: "Stakeholders", href: "/admin/stakeholders", icon: UsersIcon },
      { name: "Families", href: "/admin/families", icon: HomeIcon },
      { name: "Bulk Import", href: "/admin/bulk-import", icon: UploadIcon },
    ],
  },
  {
    id: "section-02",
    heading: "SECTION 02 — SURVEY CONFIGURATION",
    items: [
      { name: "Interviews", href: "/admin/doctor-interviews", icon: StethoscopeIcon },
      { name: "Question Bank", href: "/admin/question-bank", icon: QuestionMarkCircleIcon },
      { name: "Survey Rounds", href: "/admin/survey-rounds", icon: CalendarIcon },
    ],
  },
  {
    id: "section-03",
    heading: "SECTION 03 — FIELD OPERATIONS & MONITORING",
    items: [
      { name: "Field Assignments", href: "/admin/assignments", icon: ClipboardIcon },
      { name: "Survey Responses", href: "/admin/survey-responses", icon: ClipboardIcon },
      { name: "Survey Monitoring", href: "/admin/survey-monitoring", icon: BarChartIcon },
      { name: "Data Quality", href: "/admin/data-quality", icon: ShieldCheckIcon },
      { name: "Audit Activity Logs", href: "/admin/audit-logs", icon: HistoryIcon },
    ],
  },
  {
    id: "section-04",
    heading: "SECTION 04 — DONOR MANAGEMENT",
    items: [
      { name: "Donor Access", href: "/admin/donor-access", icon: UsersIcon },
    ],
  },
];

/**
 * Helper to determine if a route is currently active.
 * Handles exact matches and nested subroutes (e.g. /admin/survey-responses/[id]).
 */
export function isRouteActive(pathname, href) {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      });

    return () => {
      isMounted = false;
    };
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

  const isSuperadmin = currentUser ? currentUser.role === "superadmin" : true;
  const isFieldWorker = currentUser?.role === "field_worker";
  const isDonor = currentUser?.role === "donor";

  return (
    <>
      {/* Mobile backdrop overlay */}
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

      {/* Sticky Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header — Fixed at Top */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 bg-white">
          <Link
            href={isSuperadmin ? "/admin/dashboard" : "/"}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
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

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List — Independently Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-4">
          {/* SUPERADMIN NAVIGATION: EXACTLY 4 SECTIONS */}
          {isSuperadmin && !isFieldWorker && !isDonor ? (
            SUPERADMIN_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-1">
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  {section.heading}
                </div>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`group flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all duration-150 ${
                          active
                            ? "bg-emerald-50/80 text-emerald-900 font-semibold border-l-[3px] border-emerald-600 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium border-l-[3px] border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))
          ) : isFieldWorker ? (
            /* Field Worker Portal Navigation (Preserved) */
            <div className="space-y-4">
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  Core Navigation
                </div>
                <nav className="space-y-0.5">
                  <Link
                    href="/"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/"
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <DashboardIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Overview</span>
                  </Link>
                  <Link
                    href="/field/dashboard"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/field/dashboard"
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <UsersIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Field Worker Portal</span>
                  </Link>
                </nav>
              </div>

              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  Field Operations
                </div>
                <nav className="space-y-0.5">
                  <Link
                    href="/field/assignments"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/field/assignments" ||
                      pathname.startsWith("/field/survey") ||
                      pathname.startsWith("/field/workflow")
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <MapPinIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>My Field Assignments</span>
                  </Link>
                  <Link
                    href="/field/doctor-interviews"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname.startsWith("/field/doctor-interviews")
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <StethoscopeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Doctor Interviews</span>
                  </Link>
                </nav>
              </div>
            </div>
          ) : isDonor ? (
            /* Donor Portal Navigation (Preserved) */
            <div className="space-y-4">
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  Core Navigation
                </div>
                <nav className="space-y-0.5">
                  <Link
                    href="/"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/"
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <DashboardIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Overview</span>
                  </Link>
                  <Link
                    href="/donor/dashboard"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/donor/dashboard"
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <BarChartIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Donor Observatory</span>
                  </Link>
                </nav>
              </div>

              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  Reports & Impact
                </div>
                <nav className="space-y-0.5">
                  <Link
                    href="/donor/reports"
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      pathname === "/donor/reports"
                        ? "bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/70 font-medium"
                    }`}
                  >
                    <BarChartIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Report Center</span>
                  </Link>
                </nav>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar Footer — Pinned at Bottom */}
        <div className="shrink-0 border-t border-slate-100 p-3.5 bg-slate-50/70">
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
              <span className="text-xs text-slate-500">Superadmin Mode</span>
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
