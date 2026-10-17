"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  FilterIcon,
  SearchIcon,
  ActivityIcon,
} from "@/components/common/Icons";

export default function DataQualityManager() {
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);

  const [filters, setFilters] = useState({
    projectId: "",
    surveyRoundId: "",
    category: "",
    severity: "",
    issueType: "",
    status: "",
    search: "",
  });

  const [issuesData, setIssuesData] = useState({
    items: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
    summary: {
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      statusCounts: { detected: 0, acknowledged: 0, resolved: 0 },
      totalUnresolved: 0,
    },
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Scan modal state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanScope, setScanScope] = useState({ projectId: "", surveyRoundId: "", category: "" });
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  // Detail & Resolve modal state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveIssueTarget, setResolveIssueTarget] = useState(null);
  const [resolveReason, setResolveReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch dropdown options
  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.items) setProjects(data.items);
      })
      .catch((err) => console.error("Error fetching projects:", err));
  }, []);

  useEffect(() => {
    const projId = filters.projectId || scanScope.projectId;
    if (projId) {
      fetch(`/api/admin/survey-rounds?projectId=${projId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.items) setRounds(data.items);
        })
        .catch(() => setRounds([]));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRounds([]);
    }
  }, [filters.projectId, scanScope.projectId]);

  // Load issues
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const q = new URLSearchParams();
      if (filters.projectId) q.append("projectId", filters.projectId);
      if (filters.surveyRoundId) q.append("surveyRoundId", filters.surveyRoundId);
      if (filters.category) q.append("category", filters.category);
      if (filters.severity) q.append("severity", filters.severity);
      if (filters.issueType) q.append("issueType", filters.issueType);
      if (filters.status) q.append("status", filters.status);
      if (filters.search) q.append("search", filters.search);
      q.append("page", page);
      q.append("limit", 20);

      const res = await fetch(`/api/admin/data-quality/issues?${q.toString()}`);
      const data = await res.json();

      if (data.success) {
        setIssuesData(data);
      } else {
        setError(data.error || "Failed to load data quality issues.");
      }
    } catch (err) {
      console.error("Fetch issues error:", err);
      setError("Network error while connecting to data quality service.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIssues();
  }, [fetchIssues]);

  // Trigger Data Quality Scan
  const handleRunScan = async () => {
    setScanning(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/data-quality/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanScope),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastScanResult(data.scan);
        setSuccessMsg(
          `Scan completed! Scanned ${data.scan.totalScanned} records. Detected ${data.scan.issuesDetected} issues (${data.scan.newIssuesCount} new, ${data.scan.resolvedIssuesCount} auto-resolved).`
        );
        setScanModalOpen(false);
        fetchIssues();
      } else {
        setError(data.error || "Scan execution failed.");
      }
    } catch (err) {
      console.error("Run scan error:", err);
      setError("Network error occurred during data quality scan.");
    } finally {
      setScanning(false);
    }
  };

  // Acknowledge issue
  const handleAcknowledge = async (issueId) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/data-quality/issues/${issueId}/acknowledge`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Issue status updated to Acknowledged.");
        fetchIssues();
        if (selectedIssue && selectedIssue.id === issueId) {
          setSelectedIssue(data.item);
        }
      } else {
        setError(data.error || "Failed to acknowledge issue.");
      }
    } catch (err) {
      setError("Error acknowledging issue.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Resolve issue
  const handleResolveSubmit = async () => {
    if (!resolveReason || resolveReason.trim().length < 5) {
      setError("Resolution reason must be at least 5 characters.");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/data-quality/issues/${resolveIssueTarget._id || resolveIssueTarget.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: resolveReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Issue successfully marked as Resolved.");
        setResolveModalOpen(false);
        setResolveReason("");
        setResolveIssueTarget(null);
        fetchIssues();
        if (selectedIssue) setSelectedIssue(null);
      } else {
        setError(data.error || "Failed to resolve issue.");
      }
    } catch (err) {
      setError("Error resolving issue.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    q.append("type", "issues");
    if (filters.projectId) q.append("projectId", filters.projectId);
    if (filters.surveyRoundId) q.append("surveyRoundId", filters.surveyRoundId);
    if (filters.severity) q.append("severity", filters.severity);
    if (filters.issueType) q.append("issueType", filters.issueType);
    if (filters.status) q.append("status", filters.status);
    window.open(`/api/admin/data-quality/export?${q.toString()}`, "_blank");
  };

  const sev = issuesData.summary?.severityCounts || { critical: 0, high: 0, medium: 0, low: 0 };
  const stat = issuesData.summary?.statusCounts || { detected: 0, acknowledged: 0, resolved: 0 };

  const getSeverityBadge = (s) => {
    switch (s) {
      case "critical":
        return <Badge variant="danger" size="sm">Critical</Badge>;
      case "high":
        return <Badge variant="warning" size="sm">High</Badge>;
      case "medium":
        return <Badge variant="secondary" size="sm">Medium</Badge>;
      case "low":
        return <Badge variant="outline" size="sm">Low</Badge>;
      default:
        return <Badge variant="outline" size="sm">{s}</Badge>;
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "detected":
        return <Badge variant="danger" size="sm">Detected</Badge>;
      case "acknowledged":
        return <Badge variant="warning" size="sm">Acknowledged</Badge>;
      case "resolved":
      case "no_longer_detected":
        return <Badge variant="primary" size="sm">Resolved</Badge>;
      default:
        return <Badge variant="outline" size="sm">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Rules Engine & Issue Tracking
          </h3>
          <p className="text-xs text-slate-500">
            Automated completeness, integrity, and cross-reference validation checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Export Issues CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setScanModalOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            Run Quality Scan
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
        </div>
      )}

      {/* Latest Scan Result Banner */}
      {lastScanResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-1 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>Latest Scan Completed: {lastScanResult.scanCode}</span>
          </div>
          <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span>Records evaluated: <strong>{lastScanResult.totalScanned}</strong></span>
            <span>Total issues detected: <strong>{lastScanResult.issuesDetected}</strong></span>
            <span>New issues flagged: <strong>{lastScanResult.newIssuesCount}</strong></span>
            <span>Automatically resolved: <strong>{lastScanResult.resolvedIssuesCount}</strong></span>
            <span>Completed at: {new Date(lastScanResult.completedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Severity Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Critical</div>
            <div className="text-2xl font-bold text-rose-900">{sev.critical}</div>
            <div className="text-[11px] text-rose-600">Integrity / Auth</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">High</div>
            <div className="text-2xl font-bold text-amber-900">{sev.high}</div>
            <div className="text-[11px] text-amber-600">Business rules</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-yellow-800 uppercase tracking-wider">Medium</div>
            <div className="text-2xl font-bold text-yellow-900">{sev.medium}</div>
            <div className="text-[11px] text-yellow-700">Inconsistencies</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Low</div>
            <div className="text-2xl font-bold text-slate-800">{sev.low}</div>
            <div className="text-[11px] text-slate-500">Warnings</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Resolved</div>
            <div className="text-2xl font-bold text-emerald-900">{stat.resolved}</div>
            <div className="text-[11px] text-emerald-700">Corrected & closed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-500 font-medium mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search code, family, description..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 p-2 pl-8 text-xs bg-white text-slate-800 focus:outline-emerald-500"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, projectId: e.target.value }));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, severity: e.target.value }));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Issue Type</label>
              <select
                value={filters.issueType}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, issueType: e.target.value }));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Types</option>
                <option value="missing_required_answer">Missing Required Answer</option>
                <option value="invalid_answer_type">Invalid Answer Type</option>
                <option value="invalid_option_value">Invalid Option Value</option>
                <option value="conditional_visibility_violation">Conditional Violation</option>
                <option value="missing_consent">Missing Consent</option>
                <option value="duplicate_response">Duplicate Response</option>
                <option value="completed_task_missing_response">Task Missing Response</option>
                <option value="submitted_response_task_incomplete">Task Status Incomplete</option>
                <option value="disabled_light_touch_violation">Disabled Light-Touch</option>
                <option value="inconsistent_references">Inconsistent References</option>
                <option value="draft_on_cancelled_task">Draft on Cancelled Task</option>
                <option value="invalid_submission_timestamp">Invalid Timestamp</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="detected">Detected</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Issue Code</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Entity Reference</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    Loading data quality issues...
                  </td>
                </tr>
              ) : issuesData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    No data quality issues found matching your filters.
                  </td>
                </tr>
              ) : (
                issuesData.items.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {iss.issueCode}
                    </td>
                    <td className="py-3 px-3">{getSeverityBadge(iss.severity)}</td>
                    <td className="py-3 px-3 font-medium text-slate-700 capitalize">
                      {iss.issueType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{iss.entityCode || "N/A"}</div>
                      <div className="text-[11px] text-slate-400">{iss.entityType}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={iss.description}>
                      {iss.description}
                    </td>
                    <td className="py-3 px-3 text-center">{getStatusBadge(iss.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIssue(iss)}
                          className="text-[11px] py-1 px-2 text-slate-700"
                        >
                          View
                        </Button>
                        {iss.status === "detected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={submittingAction}
                            onClick={() => handleAcknowledge(iss.id)}
                            className="text-[11px] py-1 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            Acknowledge
                          </Button>
                        )}
                        {iss.status !== "resolved" && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={submittingAction}
                            onClick={() => {
                              setResolveIssueTarget(iss);
                              setResolveReason("");
                              setResolveModalOpen(true);
                            }}
                            className="text-[11px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {issuesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing page {issuesData.pagination.page} of {issuesData.pagination.totalPages} ({issuesData.pagination.total} total)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= issuesData.pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal 1: Run Data Quality Scan */}
      <Modal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Execute Data Quality Scan"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Select scan scope. The scan iterates across records in bounded batches, evaluates active questionnaire rules, flags data discrepancies, and reconciles resolved issues.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Project</label>
              <select
                value={scanScope.projectId}
                onChange={(e) => setScanScope((prev) => ({ ...prev, projectId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
              >
                <option value="">All Projects (System-wide)</option>
                {projects.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Survey Round</label>
              <select
                value={scanScope.surveyRoundId}
                onChange={(e) => setScanScope((prev) => ({ ...prev, surveyRoundId: e.target.value }))}
                disabled={!scanScope.projectId}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{scanScope.projectId ? "All Rounds in Project" : "Select Project First"}</option>
                {rounds.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Questionnaire Category</label>
              <select
                value={scanScope.category}
                onChange={(e) => setScanScope((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
              >
                <option value="">All Categories</option>
                <option value="family">Family Survey</option>
                <option value="asha">ASHA Worker</option>
                <option value="facility_staff">PHC Facility Staff</option>
                <option value="light_touch">Light-Touch Verification</option>
                <option value="govt_official">Government Official</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px]">
            <strong>Note:</strong> Quality scans do not modify survey responses. Existing unresolved issues are kept stable and reconciled automatically.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScanModalOpen(false)}
              disabled={scanning}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunScan}
              disabled={scanning}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {scanning ? "Scanning in batches..." : "Initiate Quality Scan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Issue Details */}
      {selectedIssue && (
        <Modal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={`Issue Details: ${selectedIssue.issueCode}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedIssue.severity)}
                {getStatusBadge(selectedIssue.status)}
              </div>
              <span className="text-[11px] text-slate-400">
                Type: {selectedIssue.issueType}
              </span>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-800">Explanation</div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed">
                {selectedIssue.description}
              </div>
            </div>

            {selectedIssue.suggestedAction && (
              <div className="space-y-1">
                <div className="font-semibold text-emerald-800">Suggested Action</div>
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-900 leading-relaxed">
                  {selectedIssue.suggestedAction}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-slate-600 border-t border-slate-100 pt-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Entity</span>
                <span className="font-semibold text-slate-900">
                  {selectedIssue.entityType}: {selectedIssue.entityCode || selectedIssue.entityId}
                </span>
              </div>
              {selectedIssue.familyCode && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Family Code</span>
                  <span className="font-semibold text-slate-900">{selectedIssue.familyCode}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">First Detected</span>
                <span>{new Date(selectedIssue.firstDetectedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Last Detected</span>
                <span>{new Date(selectedIssue.lastDetectedAt).toLocaleString()}</span>
              </div>
              {selectedIssue.resolutionReason && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Resolution Reason</span>
                  <span className="italic text-slate-700">{selectedIssue.resolutionReason}</span>
                </div>
              )}
            </div>

            {/* Quick Action Links */}
            {selectedIssue.entityType === "SurveyResponse" && (
              <div className="pt-2">
                <Link
                  href={`/admin/survey-responses/${selectedIssue.entityId}`}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 underline"
                >
                  Inspect Survey Response Record →
                </Link>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIssue(null)}
              >
                Close
              </Button>
              {selectedIssue.status === "detected" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledge(selectedIssue.id)}
                  className="text-amber-700 border-amber-300"
                >
                  Acknowledge
                </Button>
              )}
              {selectedIssue.status !== "resolved" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setResolveIssueTarget(selectedIssue);
                    setResolveReason("");
                    setResolveModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Resolve Issue
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Resolve Issue Confirmation */}
      {resolveModalOpen && (
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title={`Resolve Issue: ${resolveIssueTarget?.issueCode}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Provide an administrative explanation for resolving this issue. An audit trail entry will be permanently logged.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Resolution Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe correction or justification for closing this quality issue..."
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Minimum 5 characters required.</span>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResolveModalOpen(false)}
                disabled={submittingAction}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResolveSubmit}
                disabled={submittingAction}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submittingAction ? "Resolving..." : "Confirm Resolution"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
