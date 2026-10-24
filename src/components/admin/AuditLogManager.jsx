"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import {
  ShieldCheckIcon,
  UsersIcon,
  ActivityIcon,
  ClockIcon,
  ClipboardIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CloseIcon,
  SearchIcon,
  FilterIcon,
  RefreshIcon,
  FolderIcon,
  HomeIcon,
  BuildingIcon,
  MapPinIcon,
  CalendarIcon,
  QuestionMarkCircleIcon,
  UploadIcon,
} from "@/components/common/Icons";

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
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

function getActionBadgeStyle(action) {
  switch (action) {
    case "CREATE":
    case "SUBMIT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "UPDATE":
    case "ASSIGN":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "STATUS_CHANGE":
    case "AMEND":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DELETE":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "RESOLVE":
    case "ACKNOWLEDGE":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "SCAN_COMPLETE":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "IMPORT":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getRoleBadgeStyle(role) {
  if (role === "field_worker") {
    return {
      label: "Field Worker",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (role === "donor") {
    return {
      label: "Donor",
      classes: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }
  return {
    label: "Administrator",
    classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
}

const ENTITY_DISPLAY_MAP = {
  Family: "Families",
  Assignment: "Field Assignments",
  SurveyResponse: "Survey Responses",
  SurveyRound: "Survey Rounds",
  Question: "Question Bank",
  DataQualityIssue: "Data Quality Issue",
  DataQualityScan: "Data Quality Scan",
  Project: "Projects",
  Mandal: "Mandals",
  Facility: "PHC / Facilities",
  Village: "Villages",
  Stakeholder: "Stakeholders",
  StakeholderTask: "Stakeholder Tasks",
  DonorProjectAccess: "Donor Access",
  BulkImport: "Bulk Import",
};

export default function AuditLogManager() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [category, setCategory] = useState("all"); // 'all' | 'admin' | 'worker' | 'donor'
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination & Filter Options
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalAll: 0,
    adminCount: 0,
    workerCount: 0,
    past24hCount: 0,
  });
  const [filterOptions, setFilterOptions] = useState({
    entityTypes: [],
    actions: [],
  });

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalTab, setModalTab] = useState("overview"); // 'overview' | 'before' | 'after' | 'raw'
  const [copiedText, setCopiedText] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        category,
      });

      if (search.trim()) params.append("search", search.trim());
      if (entityType && entityType !== "all") params.append("entityType", entityType);
      if (action && action !== "all") params.append("action", action);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load audit logs");
      }

      setLogs(data.logs || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.stats) setStats(data.stats);
      if (data.filterOptions) setFilterOptions(data.filterOptions);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err.message || "An unexpected error occurred while loading logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, search, entityType, action, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleResetFilters() {
    setSearch("");
    setEntityType("");
    setAction("");
    setStartDate("");
    setEndDate("");
    setCategory("all");
    setPage(1);
  }

  function handleCategoryChange(newCat) {
    setCategory(newCat);
    setPage(1);
  }

  function handleCopyJson(data) {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    (entityType && entityType !== "all") ||
    (action && action !== "all") ||
    startDate !== "" ||
    endDate !== "" ||
    category !== "all";

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCategoryChange("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCategoryChange("all");
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            category === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${category === "all" ? "text-slate-300" : "text-slate-500"}`}>
              All Audit Logs
            </span>
            <div className={`p-2 rounded-lg ${category === "all" ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-700"}`}>
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats.totalAll.toLocaleString()}
            </span>
            <span className={`text-[11px] ${category === "all" ? "text-slate-400" : "text-slate-500"}`}>
              total recorded
            </span>
          </div>
        </div>

        {/* Administrative Actions */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCategoryChange("admin")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCategoryChange("admin");
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            category === "admin"
              ? "bg-indigo-900 text-white border-indigo-900 shadow-md ring-2 ring-indigo-500/50"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${category === "admin" ? "text-indigo-200" : "text-slate-500"}`}>
              Administrative Actions
            </span>
            <div className={`p-2 rounded-lg ${category === "admin" ? "bg-indigo-800 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats.adminCount.toLocaleString()}
            </span>
            <span className={`text-[11px] ${category === "admin" ? "text-indigo-200" : "text-slate-500"}`}>
              superadmin actions
            </span>
          </div>
        </div>

        {/* Field Worker Actions */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCategoryChange("worker")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCategoryChange("worker");
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            category === "worker"
              ? "bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/50"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${category === "worker" ? "text-emerald-200" : "text-slate-500"}`}>
              Worker Actions
            </span>
            <div className={`p-2 rounded-lg ${category === "worker" ? "bg-emerald-800 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
              <ClipboardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats.workerCount.toLocaleString()}
            </span>
            <span className={`text-[11px] ${category === "worker" ? "text-emerald-200" : "text-slate-500"}`}>
              surveys & tasks
            </span>
          </div>
        </div>

        {/* Past 24h Activity */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">24-Hour Activity</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.past24hCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500">recent events</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Category Tabs & Quick Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto text-xs font-medium">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                category === "all"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Logs ({stats.totalAll})
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("admin")}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                category === "admin"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Audited Admin Actions ({stats.adminCount})
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("worker")}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                category === "worker"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Worker Actions ({stats.workerCount})
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <span className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Email / Entity ID
            </span>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. admin@, FAM-1002, SUBMIT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Module / Page Dropdown */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1">
              Page / Module Logged
            </span>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="">All Modules & Pages</option>
              {filterOptions.entityTypes.map((entity) => (
                <option key={entity} value={entity}>
                  {ENTITY_DISPLAY_MAP[entity] || entity} ({entity})
                </option>
              ))}
            </select>
          </div>

          {/* Action Dropdown */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1">
              Action Type
            </span>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="">All Actions</option>
              {filterOptions.actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker (From - To) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition-all"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold">Failed to load audit logs:</span> {error}
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="text-xs font-semibold text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Logs List - Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">System Activity Records</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-700">
              {totalCount.toLocaleString()} total
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">
              Loading audit and worker logs...
            </span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No activity logs found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {hasActiveFilters
                ? "No audit records match your selected filters. Try clearing the search or category filter."
                : "No logs have been recorded in the system yet."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor & Role</th>
                    <th className="px-4 py-3">Page / Module</th>
                    <th className="px-4 py-3">Action & Summary</th>
                    <th className="px-4 py-3">Entity ID</th>
                    <th className="px-5 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const roleInfo = getRoleBadgeStyle(log.actorRole);
                    const actionClass = getActionBadgeStyle(log.action);
                    const entityLabel = ENTITY_DISPLAY_MAP[log.entityType] || log.entityType;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedLog(log);
                          setModalTab("overview");
                        }}
                      >
                        {/* Timestamp */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {formatDateTime(log.timestamp)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </td>

                        {/* Actor & Role */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {(log.actorEmail || "S")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate max-w-[180px]">
                                {log.actorEmail}
                              </div>
                              <span
                                className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold border mt-0.5 ${roleInfo.classes}`}
                              >
                                {roleInfo.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Module / Entity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800">
                            {entityLabel}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.entityType}
                          </div>
                        </td>

                        {/* Action & Description */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono shrink-0 ${actionClass}`}
                            >
                              {log.action}
                            </span>
                            <span className="text-slate-800 font-medium truncate max-w-[280px]">
                              {log.description}
                            </span>
                          </div>
                        </td>

                        {/* Entity ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.entityId ? (
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[140px] inline-block">
                              {log.entityId}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                              setModalTab("overview");
                            }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-50 transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {logs.map((log) => {
                const roleInfo = getRoleBadgeStyle(log.actorRole);
                const actionClass = getActionBadgeStyle(log.action);
                const entityLabel = ENTITY_DISPLAY_MAP[log.entityType] || log.entityType;

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setModalTab("overview");
                    }}
                    className="p-4 space-y-2.5 hover:bg-slate-50 transition-colors active:bg-slate-100"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${actionClass}`}
                        >
                          {log.action}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${roleInfo.classes}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {log.description}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div className="truncate max-w-[200px]">
                        by <span className="font-semibold text-slate-700">{log.actorEmail}</span>
                      </div>
                      <span className="font-mono text-slate-600 font-semibold">
                        {entityLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. Pagination Bar */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-800">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(page * limit, totalCount)}
                </span>{" "}
                of <span className="font-bold text-slate-800">{totalCount.toLocaleString()}</span>{" "}
                logs
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-xs font-medium text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 6. Inspection Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record #${selectedLog.id.slice(-8)}`}
          size="xl"
        >
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Modal Subheader Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border font-mono ${getActionBadgeStyle(
                    selectedLog.action
                  )}`}
                >
                  {selectedLog.action}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                    getRoleBadgeStyle(selectedLog.actorRole).classes
                  }`}
                >
                  {getRoleBadgeStyle(selectedLog.actorRole).label}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {ENTITY_DISPLAY_MAP[selectedLog.entityType] || selectedLog.entityType}
                </span>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {formatDateTime(selectedLog.timestamp)}
              </div>
            </div>

            {/* Modal Segment Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setModalTab("overview")}
                className={`flex-1 py-1.5 px-3 rounded-md transition-colors text-center ${
                  modalTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Overview & Context
              </button>
              {selectedLog.before && (
                <button
                  type="button"
                  onClick={() => setModalTab("before")}
                  className={`flex-1 py-1.5 px-3 rounded-md transition-colors text-center ${
                    modalTab === "before"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Before State
                </button>
              )}
              {selectedLog.after && (
                <button
                  type="button"
                  onClick={() => setModalTab("after")}
                  className={`flex-1 py-1.5 px-3 rounded-md transition-colors text-center ${
                    modalTab === "after"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  After State
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalTab("raw")}
                className={`flex-1 py-1.5 px-3 rounded-md transition-colors text-center ${
                  modalTab === "raw"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Full JSON Payload
              </button>
            </div>

            {/* Tab 1: Overview */}
            {modalTab === "overview" && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Action Description
                  </span>
                  <p className="text-sm font-bold text-slate-900">{selectedLog.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Actor Email
                    </span>
                    <span className="font-semibold text-slate-800 break-all">
                      {selectedLog.actorEmail}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Actor System ID
                    </span>
                    <span className="font-mono text-slate-800 break-all">
                      {selectedLog.actorId || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Target Entity ID
                    </span>
                    <span className="font-mono font-bold text-slate-900 break-all">
                      {selectedLog.entityId || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      IP Address
                    </span>
                    <span className="font-mono text-slate-800">
                      {selectedLog.ipAddress || "Internal / Local"}
                    </span>
                  </div>
                </div>

                {selectedLog.userAgent && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
                      Client User Agent
                    </span>
                    <span className="text-[11px] font-mono text-slate-700 break-all">
                      {selectedLog.userAgent}
                    </span>
                  </div>
                )}

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px]">
                    PII Shield: Contact numbers and sensitive personal data are automatically
                    redacted from audit records according to protocol compliance standards.
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Before State */}
            {modalTab === "before" && selectedLog.before && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    State Before Modification
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(selectedLog.before)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {copiedText ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
            )}

            {/* Tab 3: After State */}
            {modalTab === "after" && selectedLog.after && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    State After Modification
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(selectedLog.after)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {copiedText ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            )}

            {/* Tab 4: Raw JSON */}
            {modalTab === "raw" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Complete Audit Document
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(selectedLog)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {copiedText ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
