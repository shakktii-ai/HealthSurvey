"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ActivityIcon,
  UsersIcon,
  ClipboardIcon,
  CalendarIcon,
  FolderIcon,
  BarChartIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@/components/common/Icons";

export default function SurveyMonitoringDashboard() {
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [filters, setFilters] = useState({
    projectId: "",
    surveyRoundId: "",
    category: "",
    fieldWorkerId: "",
    assignmentStatus: "",
    responseStatus: "",
    startDate: "",
    endDate: "",
  });

  const [metrics, setMetrics] = useState(null);
  const [workerProgress, setWorkerProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("workers");

  // Load dropdown options
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/projects").then((r) => r.json()),
      fetch("/api/admin/users?role=field_worker").then((r) => r.json()),
    ])
      .then(([projData, userData]) => {
        if (projData.success && projData.items) setProjects(projData.items);
        if (userData.success && userData.items) setWorkers(userData.items);
      })
      .catch((err) => console.error("Error loading dropdown data:", err));
  }, []);

  // Update rounds when project changes
  useEffect(() => {
    if (filters.projectId) {
      fetch(`/api/admin/survey-rounds?projectId=${filters.projectId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.items) setRounds(data.items);
        })
        .catch(() => setRounds([]));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRounds([]);
      setFilters((prev) => ({ ...prev, surveyRoundId: "" }));
    }
  }, [filters.projectId]);

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const q = new URLSearchParams();
      if (filters.projectId) q.append("projectId", filters.projectId);
      if (filters.surveyRoundId) q.append("surveyRoundId", filters.surveyRoundId);
      if (filters.category) q.append("category", filters.category);
      if (filters.fieldWorkerId) q.append("fieldWorkerId", filters.fieldWorkerId);
      if (filters.assignmentStatus) q.append("assignmentStatus", filters.assignmentStatus);
      if (filters.responseStatus) q.append("responseStatus", filters.responseStatus);
      if (filters.startDate) q.append("startDate", filters.startDate);
      if (filters.endDate) q.append("endDate", filters.endDate);

      const [resMetrics, resWorkers] = await Promise.all([
        fetch(`/api/admin/survey-monitoring?${q.toString()}`).then((r) => r.json()),
        fetch(`/api/admin/survey-monitoring/workers?projectId=${filters.projectId}&surveyRoundId=${filters.surveyRoundId}`).then((r) => r.json()),
      ]);

      if (resMetrics.success) {
        setMetrics(resMetrics);
      } else {
        setError(resMetrics.error || "Failed to load monitoring metrics");
      }

      if (resWorkers.success && resWorkers.items) {
        setWorkerProgress(resWorkers.items);
      }
    } catch (err) {
      console.error("Fetch monitoring data error:", err);
      setError("Network error while connecting to survey monitoring service.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      projectId: "",
      surveyRoundId: "",
      category: "",
      fieldWorkerId: "",
      assignmentStatus: "",
      responseStatus: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleExportMonitoringCsv = () => {
    const q = new URLSearchParams();
    q.append("type", "monitoring");
    if (filters.projectId) q.append("projectId", filters.projectId);
    if (filters.surveyRoundId) q.append("surveyRoundId", filters.surveyRoundId);
    window.open(`/api/admin/data-quality/export?${q.toString()}`, "_blank");
  };

  const fAsg = metrics?.familyAssignments || {
    totalEligible: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    completionPercentage: 0,
    familiesNotYetInterviewed: 0,
  };

  const fResp = metrics?.responses || { draft: 0, submitted: 0, amended: 0, totalSubmitted: 0 };
  const sTask = metrics?.stakeholderTasks || { completed: 0, outstanding: 0, cancelled: 0 };

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <FolderIcon className="w-4 h-4 text-emerald-600" />
              <span>Monitoring Filters & Scope</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Reset Filters
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={fetchMonitoringData}
                disabled={loading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Refreshing..." : "Refresh Data"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMonitoringCsv}
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => handleFilterChange("projectId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Survey Round</label>
              <select
                value={filters.surveyRoundId}
                onChange={(e) => handleFilterChange("surveyRoundId", e.target.value)}
                disabled={!filters.projectId}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{filters.projectId ? "All Rounds in Project" : "Select Project First"}</option>
                {rounds.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Questionnaire Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Categories</option>
                <option value="family">Family (Household)</option>
                <option value="asha">ASHA Worker</option>
                <option value="facility_staff">PHC / Facility Staff</option>
                <option value="light_touch">Light-Touch Verification</option>
                <option value="govt_official">Government Official</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Field Worker</label>
              <select
                value={filters.fieldWorkerId}
                onChange={(e) => handleFilterChange("fieldWorkerId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Field Workers</option>
                {workers.map((w) => (
                  <option key={w.id || w._id} value={w.id || w._id}>
                    {w.name} ({w.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Assignment Status</label>
              <select
                value={filters.assignmentStatus}
                onChange={(e) => handleFilterChange("assignmentStatus", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Assignment Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Response Status</label>
              <select
                value={filters.responseStatus}
                onChange={(e) => handleFilterChange("responseStatus", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Response Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="amended">Amended</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error / Warning Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {metrics && !metrics.hasData && !loading && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notice:</span>
            <span>No survey records found matching the selected project, round, or filters. Showing zero baseline.</span>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Eligible */}
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Eligible Tasks
            </div>
            <div className="text-2xl font-bold text-slate-900">{fAsg.totalEligible}</div>
            <div className="text-[11px] text-slate-400">Excludes cancelled</div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              In-Progress
            </div>
            <div className="text-2xl font-bold text-amber-900">{fAsg.inProgress}</div>
            <div className="text-[11px] text-amber-600">{fAsg.assigned} pending start</div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Completed Tasks
            </div>
            <div className="text-2xl font-bold text-emerald-900">{fAsg.completed}</div>
            <div className="text-[11px] text-emerald-600">{fAsg.cancelled} cancelled</div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Completion Rate
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {fAsg.completionPercentage}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, fAsg.completionPercentage)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Submissions
            </div>
            <div className="text-2xl font-bold text-slate-900">{fResp.totalSubmitted}</div>
            <div className="text-[11px] text-slate-400">
              {fResp.draft} drafts | {fResp.amended} amended
            </div>
          </CardContent>
        </Card>

        {/* Families Pending */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
              Unsurveyed Families
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {fAsg.familiesNotYetInterviewed}
            </div>
            <div className="text-[11px] text-purple-600">Pending interview</div>
          </CardContent>
        </Card>
      </div>

      {/* Stakeholder Tasks Quick Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">Shared Stakeholder Interviews</div>
            <div className="text-[11px] text-slate-500">
              ASHA workers, PHC facility staff, light-touch verifications, and govt officials
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Completed</span>
            <span className="text-base font-bold text-emerald-700">{sTask.completed}</span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Outstanding</span>
            <span className="text-base font-bold text-amber-700">{sTask.outstanding}</span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cancelled</span>
            <span className="text-base font-bold text-slate-500">{sTask.cancelled}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab("workers")}
          className={`pb-2 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === "workers"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Field Worker Progress Breakdown ({workerProgress.length})
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`pb-2 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === "summary"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Scope Summary & Ratios
        </button>
      </div>

      {/* Tab 1: Worker Progress Breakdown */}
      {activeTab === "workers" && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Field Worker</th>
                  <th className="py-3 px-3 text-center">Assigned</th>
                  <th className="py-3 px-3 text-center">In Progress</th>
                  <th className="py-3 px-3 text-center">Completed</th>
                  <th className="py-3 px-3 text-center">Cancelled</th>
                  <th className="py-3 px-3 text-center">Outstanding</th>
                  <th className="py-3 px-4 text-center">Completion %</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerProgress.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No field workers found for this scope.
                    </td>
                  </tr>
                ) : (
                  workerProgress.map((w) => (
                    <tr key={w.workerId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{w.name}</div>
                        <div className="text-[11px] text-slate-400">{w.email}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {w.assignedTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-amber-700">
                        {w.inProgressTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        {w.completedTasks}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">
                        {w.cancelledTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        {w.outstandingTasks}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-slate-800">
                            {w.completionPercentage}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden sm:block overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, w.completionPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {w.lastActivityAt ? (
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{new Date(w.lastActivityAt).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No activity recorded</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFilterChange("fieldWorkerId", w.workerId)}
                          className="text-[11px] py-1 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          Filter Worker
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Scope Summary & Ratios */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Task Allocation & Lifecycle Ratios</h4>
              <p className="text-xs text-slate-500">
                Derived directly from Mongoose schemas without counting cancelled tasks into completion percentages.
              </p>
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Active Family Assignments</span>
                  <span className="font-semibold text-slate-900">{fAsg.totalEligible}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Assigned (Not Started)</span>
                  <span className="font-semibold text-slate-700">{fAsg.assigned}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">In Progress</span>
                  <span className="font-semibold text-amber-700">{fAsg.inProgress}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Completed Submissions</span>
                  <span className="font-semibold text-emerald-700">{fAsg.completed}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Cancelled Tasks (Excluded from denominator)</span>
                  <span className="font-semibold text-slate-400">{fAsg.cancelled}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Response Integrity Breakdown</h4>
              <p className="text-xs text-slate-500">
                Summary of submissions recorded across household and stakeholder questionnaires.
              </p>
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Draft Responses Saved</span>
                  <span className="font-semibold text-slate-700">{fResp.draft}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Submitted Responses</span>
                  <span className="font-semibold text-emerald-700">{fResp.submitted}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Amended Submissions (Audited Revisions)</span>
                  <span className="font-semibold text-teal-700">{fResp.amended}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Stakeholder Tasks Outstanding</span>
                  <span className="font-semibold text-amber-700">{sTask.outstanding}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Stakeholder Tasks Completed</span>
                  <span className="font-semibold text-emerald-700">{sTask.completed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
