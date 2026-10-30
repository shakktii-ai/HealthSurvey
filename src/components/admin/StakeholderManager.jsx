"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  UsersIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
} from "@/components/common/Icons";
import PermanentDeleteStakeholderModal from "@/components/admin/PermanentDeleteStakeholderModal";

const TYPE_CONFIG = {
  asha: {
    label: "ASHA Worker",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  doctor: {
    label: "Doctor / Medical Officer",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  facility_staff: {
    label: "Facility Staff",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  government_official: {
    label: "Government Official",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

export default function StakeholderManager() {
  const [stakeholders, setStakeholders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allMandals, setAllMandals] = useState([]);
  const [allFacilities, setAllFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [mandalFilter, setMandalFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // PII Visibility toggle
  const [revealedPhones, setRevealedPhones] = useState({});

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fullName, setFullName] = useState("");
  const [stakeholderType, setStakeholderType] = useState("asha");
  const [projectId, setProjectId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permanent Deletion state
  const [stakeholderToDelete, setStakeholderToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchStakeholders();
  }, [search, typeFilter, projectFilter, mandalFilter, facilityFilter, statusFilter, page]);

  async function fetchMetadata() {
    try {
      const [projRes, manRes, facRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/mandals?status=active&limit=200"),
        fetch("/api/admin/facilities?status=active&limit=300"),
      ]);
      const projData = await projRes.json();
      const manData = await manRes.json();
      const facData = await facRes.json();

      if (projRes.ok && projData.success) {
        setProjects(projData.items || []);
      }
      if (manRes.ok && manData.success) {
        setAllMandals(manData.items || []);
      }
      if (facRes.ok && facData.success) {
        setAllFacilities(facData.items || []);
      }
    } catch {
      // Ignored
    }
  }

  async function fetchStakeholders() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("stakeholderType", typeFilter);
      if (projectFilter) params.set("projectId", projectFilter);
      if (mandalFilter) params.set("mandalId", mandalFilter);
      if (facilityFilter) params.set("facilityId", facilityFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/stakeholders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load stakeholders");

      setStakeholders(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / 15) || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // --- CASCADING FORM DROPDOWNS ---
  const formMandals = allMandals.filter(
    (m) => !projectId || m.projectId === projectId || m.project?.id === projectId
  );

  const formFacilities = allFacilities.filter((f) => {
    const matchesProj = !projectId || f.projectId === projectId || f.project?.id === projectId;
    const matchesMandal = !mandalId || f.mandalId === mandalId || f.mandal?.id === mandalId;
    return matchesProj && matchesMandal;
  });

  function handleFormProjectChange(newProjId) {
    setProjectId(newProjId);
    const validMandals = allMandals.filter(
      (m) => !newProjId || m.projectId === newProjId || m.project?.id === newProjId
    );
    const newMandalId = validMandals.length > 0 ? validMandals[0].id : "";
    setMandalId(newMandalId);

    const validFacilities = allFacilities.filter(
      (f) =>
        (!newProjId || f.projectId === newProjId || f.project?.id === newProjId) &&
        (!newMandalId || f.mandalId === newMandalId || f.mandal?.id === newMandalId)
    );
    setFacilityId(validFacilities.length > 0 ? validFacilities[0].id : "");
  }

  function handleFormMandalChange(newMandalId) {
    setMandalId(newMandalId);
    const validFacilities = allFacilities.filter(
      (f) =>
        (!projectId || f.projectId === projectId || f.project?.id === projectId) &&
        (!newMandalId || f.mandalId === newMandalId || f.mandal?.id === newMandalId)
    );
    setFacilityId(validFacilities.length > 0 ? validFacilities[0].id : "");
  }

  // --- CASCADING FILTER DROPDOWNS ---
  const filterMandals = allMandals.filter(
    (m) => !projectFilter || m.projectId === projectFilter || m.project?.id === projectFilter
  );

  const filterFacilities = allFacilities.filter((f) => {
    const matchesProj = !projectFilter || f.projectId === projectFilter || f.project?.id === projectFilter;
    const matchesMandal = !mandalFilter || f.mandalId === mandalFilter || f.mandal?.id === mandalFilter;
    return matchesProj && matchesMandal;
  });

  function togglePhoneVisibility(id) {
    setRevealedPhones((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function maskPhone(p) {
    if (!p) return "Not provided";
    if (p.length < 4) return "••••";
    return p.slice(0, 2) + "••••••" + p.slice(-2);
  }

  function openCreateForm() {
    setEditingId(null);
    setFullName("");
    setStakeholderType("asha");
    setPhone("");
    setDesignation("");

    const defaultProjId = projects.length > 0 ? projects[0].id : "";
    setProjectId(defaultProjId);

    const validMandals = allMandals.filter(
      (m) => !defaultProjId || m.projectId === defaultProjId || m.project?.id === defaultProjId
    );
    const defaultMandalId = validMandals.length > 0 ? validMandals[0].id : "";
    setMandalId(defaultMandalId);

    const validFacilities = allFacilities.filter(
      (f) =>
        (!defaultProjId || f.projectId === defaultProjId || f.project?.id === defaultProjId) &&
        (!defaultMandalId || f.mandalId === defaultMandalId || f.mandal?.id === defaultMandalId)
    );
    setFacilityId(validFacilities.length > 0 ? validFacilities[0].id : "");

    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function openEditForm(stk) {
    setEditingId(stk.id);
    setFullName(stk.fullName);
    setStakeholderType(stk.stakeholderType);
    setProjectId(stk.projectId || stk.project?.id || "");
    setMandalId(stk.mandalId || stk.mandal?.id || "");
    setFacilityId(stk.facilityId || stk.facility?.id || "");
    setPhone(stk.phone || "");
    setDesignation(stk.designation || "");
    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionMessage("");

    try {
      const url = editingId ? `/api/admin/stakeholders/${editingId}` : "/api/admin/stakeholders";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        fullName: fullName.trim(),
        stakeholderType,
        projectId,
        mandalId,
        facilityId: facilityId || null,
        phone: phone.trim(),
        designation: designation.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Operation failed");
      }

      setActionMessage(editingId ? "Stakeholder updated successfully." : "Stakeholder registered successfully.");
      setIsFormOpen(false);
      fetchStakeholders();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(stk) {
    const nextStatus = stk.status === "active" ? "inactive" : "active";
    const confirmMsg =
      nextStatus === "inactive"
        ? `Deactivate stakeholder "${stk.fullName}"? Historical references will remain intact.`
        : `Activate stakeholder "${stk.fullName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/stakeholders/${stk.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Status update failed");

      setActionMessage(`Stakeholder ${nextStatus === "active" ? "activated" : "deactivated"} successfully.`);
      fetchStakeholders();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage("")}
            className="ml-auto text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 animate-fadeIn">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-rose-600 hover:text-rose-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control & Filter Bar */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by stakeholder name or designation..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <Button onClick={openCreateForm} variant="primary" className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>Add Stakeholder</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="asha">ASHA Worker</option>
                <option value="doctor">Doctor</option>
                <option value="facility_staff">Facility Staff</option>
                <option value="government_official">Govt Official</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setMandalFilter("");
                  setFacilityFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mandal</label>
              <select
                value={mandalFilter}
                onChange={(e) => {
                  setMandalFilter(e.target.value);
                  setFacilityFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Mandals</option>
                {filterMandals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Facility</label>
              <select
                value={facilityFilter}
                onChange={(e) => {
                  setFacilityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Facilities</option>
                {filterFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholders Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Key Stakeholder Registry ({totalCount})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Master records of ASHA Workers, Facility Staff, and Government Health Officials
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="mt-2 text-xs">Loading stakeholders...</p>
            </div>
          ) : stakeholders.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="mx-auto w-10 h-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No Stakeholders Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || typeFilter || projectFilter || mandalFilter || statusFilter
                  ? "Try resetting your search or filters to see more records."
                  : "No stakeholder records created yet. Click 'Add Stakeholder' to register one."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Stakeholder Details</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Jurisdiction & Facility</th>
                    <th className="px-6 py-3 font-semibold">Phone (Protected PII)</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stakeholders.map((stk) => {
                    const cfg = TYPE_CONFIG[stk.stakeholderType] || {
                      label: stk.stakeholderType,
                      badgeClass: "bg-slate-100 text-slate-700",
                    };
                    const isPhoneVisible = revealedPhones[stk.id];

                    return (
                      <tr key={stk.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-900">{stk.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {stk.designation || "No designation specified"}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.badgeClass}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-slate-800">
                            {stk.mandal?.name || "Mandal N/A"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {stk.facility ? `${stk.facility.name} (${stk.facility.code})` : stk.project?.name || "Project"}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {stk.phone ? (
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span>{isPhoneVisible ? stk.phone : maskPhone(stk.phone)}</span>
                              <button
                                onClick={() => togglePhoneVisibility(stk.id)}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-sans"
                              >
                                {isPhoneVisible ? "Hide" : "Show"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant={stk.status === "active" ? "success" : "neutral"} size="sm">
                            {stk.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(stk)}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium text-xs transition-colors"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStakeholderToDelete(stk);
                              setIsDeleteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold text-xs transition-colors"
                            title="Permanently Delete Stakeholder"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Stakeholder" : "Register Stakeholder"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingId ? "Update stakeholder profile and jurisdiction" : "Add an ASHA, facility staff, or official record"}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smt. K. Lakshmi, Dr. R. Verma"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stakeholder Type *
                  </label>
                  <select
                    required
                    value={stakeholderType}
                    onChange={(e) => setStakeholderType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="asha">ASHA Worker</option>
                    <option value="doctor">Doctor / Medical Officer</option>
                    <option value="facility_staff">Facility Staff</option>
                    <option value="government_official">Government Official</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation (Optional)
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. ANM, Medical Officer, Tahsildar"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Protected PII)
                </label>
                <input
                  type="tel"
                  pattern="^[0-9+ -]{7,15}$"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Stored securely. Masked in UI and omitted from audit logs.
                </p>
              </div>

              {/* Geographic hierarchy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Associated Project *
                  </label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => handleFormProjectChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="" disabled>
                      Select Project
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Associated Mandal *
                  </label>
                  <select
                    required
                    value={mandalId}
                    onChange={(e) => handleFormMandalChange(e.target.value)}
                    disabled={!projectId || formMandals.length === 0}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="" disabled>
                      Select Mandal
                    </option>
                    {formMandals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associated Facility (Optional for Officials)
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={!mandalId || formFacilities.length === 0}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">None / Not Applicable</option>
                  {formFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facilityType || "PHC"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {editingId ? "Update Stakeholder" : "Register Stakeholder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation & Dependency Modal */}
      <PermanentDeleteStakeholderModal
        stakeholder={stakeholderToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStakeholderToDelete(null);
        }}
        onDeleted={(result) => {
          setActionMessage(
            result.message ||
              `Stakeholder "${stakeholderToDelete?.fullName}" and dependent records were permanently deleted.`
          );
          setIsDeleteModalOpen(false);
          setStakeholderToDelete(null);
          fetchStakeholders();
        }}
      />
    </div>
  );
}
