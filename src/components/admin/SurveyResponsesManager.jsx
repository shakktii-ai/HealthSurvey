"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ClipboardIcon,
  SearchIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/common/Icons";

export default function SurveyResponsesManager() {
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);

  const [filters, setFilters] = useState({
    projectId: "",
    surveyRoundId: "",
    category: "",
    status: "",
    search: "",
    startDate: "",
    endDate: "",
  });

  const [responsesData, setResponsesData] = useState({
    items: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.items) setProjects(data.items);
      })
      .catch((err) => console.error("Error loading projects:", err));
  }, []);

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
    }
  }, [filters.projectId]);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const q = new URLSearchParams();
      if (filters.projectId) q.append("projectId", filters.projectId);
      if (filters.surveyRoundId) q.append("surveyRoundId", filters.surveyRoundId);
      if (filters.category) q.append("category", filters.category);
      if (filters.status) q.append("status", filters.status);
      if (filters.search) q.append("search", filters.search);
      if (filters.startDate) q.append("startDate", filters.startDate);
      if (filters.endDate) q.append("endDate", filters.endDate);
      q.append("page", page);
      q.append("limit", 20);

      const res = await fetch(`/api/admin/survey-responses?${q.toString()}`);
      const data = await res.json();

      if (data.success) {
        setResponsesData(data);
      } else {
        setError(data.error || "Failed to load responses.");
      }
    } catch (err) {
      console.error("Fetch responses error:", err);
      setError("Network error while connecting to responses service.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResponses();
  }, [fetchResponses]);

  const getStatusBadge = (st) => {
    switch (st) {
      case "submitted":
        return <Badge variant="primary" size="sm">Submitted</Badge>;
      case "amended":
        return <Badge variant="secondary" size="sm">Amended</Badge>;
      case "draft":
        return <Badge variant="warning" size="sm">Draft</Badge>;
      default:
        return <Badge variant="outline" size="sm">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-500 font-medium mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search response code or family..."
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
                  setFilters((prev) => ({ ...prev, projectId: e.target.value, surveyRoundId: "" }));
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
              <label className="block text-slate-500 font-medium mb-1">Survey Round</label>
              <select
                value={filters.surveyRoundId}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, surveyRoundId: e.target.value }));
                  setPage(1);
                }}
                disabled={!filters.projectId}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{filters.projectId ? "All Rounds" : "Select Project"}</option>
                {rounds.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, category: e.target.value }));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
              >
                <option value="">All Categories</option>
                <option value="family">Family</option>
                <option value="asha">ASHA Worker</option>
                <option value="facility_staff">Facility Staff</option>
                <option value="light_touch">Light-Touch</option>
                <option value="govt_official">Govt Official</option>
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
                <option value="submitted">Submitted</option>
                <option value="amended">Amended</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Responses Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Response Code</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Respondent / Target</th>
                <th className="py-3 px-3">Field Worker</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Rev</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    Loading survey submissions...
                  </td>
                </tr>
              ) : responsesData.items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    No survey responses found matching criteria.
                  </td>
                </tr>
              ) : (
                responsesData.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {r.responseCode}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-medium text-slate-700">
                        {r.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.family ? (
                        <div>
                          <span className="font-semibold text-slate-900">{r.family.familyCode}</span>
                          <span className="text-[11px] text-slate-500 block">
                            Head: {r.family.householdHeadName}
                          </span>
                        </div>
                      ) : r.stakeholder ? (
                        <div>
                          <span className="font-semibold text-slate-900">{r.stakeholder.fullName}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {r.stakeholder.stakeholderType}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">{r.respondentName || "N/A"}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.fieldWorker?.name || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      v{r.revision || 1}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "Not submitted"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/survey-responses/${r.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {responsesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing page {responsesData.pagination.page} of {responsesData.pagination.totalPages} ({responsesData.pagination.total} total)
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
                disabled={page >= responsesData.pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
