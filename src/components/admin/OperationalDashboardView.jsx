import Link from "next/link";
import {
  FolderIcon,
  MapPinIcon,
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  BarChartIcon,
  ArrowRightIcon,
  BuildingIcon,
  QuestionMarkCircleIcon,
  UploadIcon,
} from "@/components/common/Icons";
import Badge from "@/components/ui/Badge";

function formatRelativeTime(date) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OperationalDashboardView({ data }) {
  const {
    summary = {},
    surveyProgress = [],
    recentActivity = [],
    assignmentOverview = {},
    dataQualityOverview = {},
  } = data || {};

  const summaryCards = [
    {
      label: "Total Projects",
      value: summary.totalProjects ?? 0,
      subtext: "Active initiatives",
      href: "/admin/projects",
      icon: FolderIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Total Villages",
      value: summary.totalVillages ?? 0,
      subtext: "Catchment habitations",
      href: "/admin/villages",
      icon: MapPinIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Registered Families",
      value: summary.totalFamilies ?? 0,
      subtext: `${summary.activeFamilies ?? 0} active in registry`,
      href: "/admin/families",
      icon: HomeIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Field Workers",
      value: summary.totalFieldWorkers ?? 0,
      subtext: "Active enumerators",
      href: "/admin/dashboard#users-section",
      icon: UsersIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Active Survey Rounds",
      value: summary.activeSurveyRounds ?? 0,
      subtext: "Protocol milestones",
      href: "/admin/survey-rounds",
      icon: CalendarIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Pending Assignments",
      value: summary.pendingAssignments ?? 0,
      subtext: "Awaiting execution",
      href: "/admin/assignments",
      icon: ClipboardIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Completed Responses",
      value: summary.completedResponses ?? 0,
      subtext: `${summary.draftResponses ?? 0} drafts in progress`,
      href: "/admin/survey-responses",
      icon: CheckCircleIcon,
      color: "text-slate-800 bg-slate-50 border-slate-200",
      accent: "hover:border-emerald-500",
    },
    {
      label: "Data Quality Issues",
      value: summary.unresolvedQualityIssues ?? 0,
      subtext: `${summary.qualityIssuesBySeverity?.critical ?? 0} critical severity`,
      href: "/admin/data-quality",
      icon: (summary.unresolvedQualityIssues ?? 0) > 0 ? AlertCircleIcon : ShieldCheckIcon,
      color: (summary.unresolvedQualityIssues ?? 0) > 0 ? "text-amber-700 bg-amber-50/50 border-amber-200" : "text-emerald-700 bg-emerald-50/50 border-emerald-200",
      accent: "hover:border-amber-500",
    },
  ];

  const quickActions = [
    { title: "Bulk Excel Import", href: "/admin/bulk-import", icon: UploadIcon },
    { title: "Create Project", href: "/admin/projects", icon: FolderIcon },
    { title: "Register Family", href: "/admin/families", icon: HomeIcon },
    { title: "Manage Assignments", href: "/admin/assignments", icon: ClipboardIcon },
    { title: "Open Question Bank", href: "/admin/question-bank", icon: QuestionMarkCircleIcon },
    { title: "View Survey Monitoring", href: "/admin/survey-monitoring", icon: BarChartIcon },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Information Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time survey operations, field coverage, data quality, and administrative activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/bulk-import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-xs transition-colors"
          >
            <UploadIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>Bulk Excel Import</span>
          </Link>
          <Link
            href="/admin/survey-monitoring"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <BarChartIcon className="w-3.5 h-3.5" />
            <span>Survey Monitoring</span>
          </Link>
          <Link
            href="/admin/data-quality"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Data Quality</span>
          </Link>
        </div>
      </div>

      {/* 2. Quick Actions Bar */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </span>
          <span className="text-[11px] text-slate-400">Direct shortcuts to operational tasks</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:shadow-xs transition-all"
              >
                <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{action.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Operational Summary Cards (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group flex flex-col justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs transition-all ${card.accent}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {card.subtext}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 4. Operational Detail Sections (2 Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Survey Progress & Field Assignment Overview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Survey Progress by Round */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Survey Progress by Round</h2>
                <p className="text-xs text-slate-500">Execution tracking across protocol milestones</p>
              </div>
              <Link
                href="/admin/survey-monitoring"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <span>Full Monitoring</span>
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {surveyProgress.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No survey rounds currently configured. Create a round in Survey Rounds.
                </div>
              ) : (
                surveyProgress.map((round) => (
                  <div key={round.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {round.code}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {round.name}
                        </span>
                        <span className="text-[11px] text-slate-400">({round.projectName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {round.completed} / {round.totalAssignments} completed
                        </span>
                        <Badge
                          variant={round.status === "active" ? "success" : "neutral"}
                          size="sm"
                        >
                          {round.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, round.completionRate || 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{round.completionRate}% completion rate</span>
                      <div className="flex items-center gap-3">
                        <span>In Progress: <strong className="text-slate-700">{round.inProgress}</strong></span>
                        <span>Pending: <strong className="text-slate-700">{round.pending}</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section C: Field Assignment Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Field Assignment Status</h2>
                <p className="text-xs text-slate-500">Allocation breakdown and workflow dispatch</p>
              </div>
              <Link
                href="/admin/assignments"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <span>Assignments Page</span>
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Assigned / Pending</span>
                <span className="text-xl font-bold text-amber-900 mt-1 block">{assignmentOverview.assigned ?? 0}</span>
                <span className="text-[10px] text-amber-700">Awaiting interview</span>
              </div>
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">In Progress</span>
                <span className="text-xl font-bold text-blue-900 mt-1 block">{assignmentOverview.inProgress ?? 0}</span>
                <span className="text-[10px] text-blue-700">Drafts saved</span>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Completed</span>
                <span className="text-xl font-bold text-emerald-900 mt-1 block">{assignmentOverview.completed ?? 0}</span>
                <span className="text-[10px] text-emerald-700">Final responses</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Cancelled / Closed</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{assignmentOverview.cancelled ?? 0}</span>
                <span className="text-[10px] text-slate-500">Excluded from active</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Overall Assignment Completion Rate:</span>
              <span className="font-bold text-slate-900">{assignmentOverview.completionRate ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Data Quality & Recent Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section D: Data Quality Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Data Quality Profile</h2>
                <p className="text-xs text-slate-500">Automated validation and anomaly audits</p>
              </div>
              <Link
                href="/admin/data-quality"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <span>Quality Portal</span>
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${dataQualityOverview.unresolved > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className="text-xs font-bold text-slate-800">
                    {dataQualityOverview.unresolved > 0 ? `${dataQualityOverview.unresolved} Unresolved Issues` : "No Anomalies Detected"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {dataQualityOverview.resolved ?? 0} resolved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                  <span className="text-rose-700 font-semibold">Critical</span>
                  <span className="font-bold text-rose-900">{dataQualityOverview.critical ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-orange-200 bg-orange-50/50 flex items-center justify-between">
                  <span className="text-orange-700 font-semibold">High</span>
                  <span className="font-bold text-orange-900">{dataQualityOverview.high ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <span className="text-amber-700 font-semibold">Medium</span>
                  <span className="font-bold text-amber-900">{dataQualityOverview.medium ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Low</span>
                  <span className="font-bold text-slate-800">{dataQualityOverview.low ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-500">Audited administrative actions</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Audit Trail
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No activity records logged yet.
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {log.description}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          {log.action}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        by <span className="font-medium text-slate-700">{log.actorEmail}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
