"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import {
  SearchIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  ActivityIcon,
} from "@/components/common/Icons";

const TASK_STATUS_PILLS = {
  completed: {
    bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "✓",
    label: "Done",
  },
  in_progress: {
    bg: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "●",
    label: "Draft",
  },
  pending: {
    bg: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "○",
    label: "Pending",
  },
  not_required: {
    bg: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "—",
    label: "N/A",
  },
};

const ROUND_STATUS_CONFIG = {
  completed: { variant: "success", label: "Round Completed" },
  in_progress: { variant: "warning", label: "In Progress" },
  pending: { variant: "neutral", label: "Pending Start" },
};

export default function FieldAssignmentList() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const searchId = useId();

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter) params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/field/family-workflow?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load family workflows");
      }

      setItems(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
      if (data.counts) {
        setCounts({
          total: data.counts.total || 0,
          pending: data.counts.pending || 0,
          in_progress: data.counts.inProgress || 0,
          completed: data.counts.completed || 0,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkflows();
  }, [fetchWorkflows]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess("")}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Households
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{counts.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/60 border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Pending Start
            </div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{counts.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              In Progress Rounds
            </div>
            <div className="text-2xl font-bold text-amber-800 mt-1">{counts.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-200 shadow-xs">
          <CardContent className="p-3.5">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Completed Rounds
            </div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">{counts.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5 text-xs">
            <div className="flex-1 relative">
              <label htmlFor={searchId} className="sr-only">
                Search
              </label>
              <Input
                id={searchId}
                placeholder="Search Household Code or Head Name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs py-1.5"
              />
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 px-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
            >
              <option value="">All Round Statuses</option>
              <option value="pending">Pending Start</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Assignment Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-28 bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-sm mx-auto space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ActivityIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Assignments Found</h3>
            <p className="text-xs text-slate-500">
              You currently have no tasks matching this filter. Once assigned by your supervisor, households will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {items.map((item) => {
            const asg = item.assignment || {};
            const fam = item.family || {};
            const round = item.surveyRound || {};
            const proj = item.project || {};
            const tasks = item.tasks || [];
            const roundStatusKey = asg.roundStatus || (item.isRoundCompleted ? "completed" : "pending");
            const roundConfig = ROUND_STATUS_CONFIG[roundStatusKey] || {
              variant: "neutral",
              label: roundStatusKey,
            };

            const familyTask = tasks.find((t) => t.taskKey === "family");
            const ashaTask = tasks.find((t) => t.taskKey === "asha");
            const facilityTask = tasks.find((t) => t.taskKey === "facility_staff");
            const govtTask = tasks.find((t) => t.taskKey === "govt_official");
            const phoneTask = tasks.find((t) => t.taskKey === "light_touch");

            return (
              <Card
                key={asg.id}
                className="hover:border-slate-300 transition-all shadow-xs p-4.5 bg-white space-y-3"
              >
                {/* Top Row: Identity & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      {fam.familyCode || "Household"}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {fam.householdHeadName}
                    </span>
                    <Badge variant={roundConfig.variant} size="sm">
                      {roundConfig.label}
                    </Badge>
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {proj.code} • {round.name} ({round.code})
                    </span>
                  </div>

                  {/* Overall Round Progress */}
                  <div className="text-[11px] text-slate-500 font-medium">
                    {asg.assignmentCode}
                  </div>
                </div>

                {/* Location & Facility Context */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {fam.village || "Village"}, {fam.mandal || "Mandal"}
                    </span>
                  </div>
                  <span>•</span>
                  <div>
                    Linked PHC: <strong className="text-slate-800">{fam.facility || "Primary Health Centre"}</strong>
                  </div>
                  {round.targetTiming && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-slate-500">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{round.targetTiming}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Task Status Stepper Row */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Family-Linked Survey Workflow Tasks:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {/* 1. Family */}
                    <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">1. Family</span>
                        <TaskStatusBadge status={familyTask?.status || "pending"} />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">Household Survey</div>
                    </div>

                    {/* 2. ASHA */}
                    <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">2. ASHA</span>
                        <TaskStatusBadge status={ashaTask?.status || "pending"} />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">Village Outreach</div>
                    </div>

                    {/* 3. Facility Staff */}
                    <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">3. Facility</span>
                        <TaskStatusBadge status={facilityTask?.status || "pending"} />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">Staff Interview</div>
                    </div>

                    {/* 4. Govt Official */}
                    <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">4. Govt Off.</span>
                        <TaskStatusBadge status={govtTask?.status || "pending"} />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">Administrative</div>
                    </div>

                    {/* 5. Phone Call */}
                    <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">5. Phone</span>
                        <TaskStatusBadge
                          status={
                            round.enableLightTouch
                              ? phoneTask?.status || "pending"
                              : "not_required"
                          }
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {round.enableLightTouch ? "Telephonic Follow-up" : "Inapplicable (M0)"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-600">
                    {item.nextTask ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Next Step: <strong>{item.nextTask.title}</strong></span>
                      </span>
                    ) : item.isRoundCompleted ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                        <span>All Workflow Tasks Complete</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/field/workflow/${asg.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs py-1.5 px-3"
                      >
                        View Family Workflow →
                      </Button>
                    </Link>

                    {item.nextTask && item.nextTask.url && (
                      <Link href={item.nextTask.url}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <ActivityIcon className="w-3.5 h-3.5" />
                          <span>
                            {item.nextTask.status === "in_progress"
                              ? "Resume Next Task"
                              : "Start Next Task"}
                          </span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <div>
                Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount} families
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskStatusBadge({ status = "pending" }) {
  const pill = TASK_STATUS_PILLS[status] || TASK_STATUS_PILLS.pending;
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${pill.bg}`}
    >
      <span>{pill.icon}</span>
      <span>{pill.label}</span>
    </span>
  );
}
