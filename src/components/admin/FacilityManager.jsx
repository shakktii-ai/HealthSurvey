"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { BuildingIcon, PlusIcon, CheckCircleIcon, AlertCircleIcon, SearchIcon, EditIcon } from "@/components/common/Icons";

export default function FacilityManager() {
  const [facilities, setFacilities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allMandals, setAllMandals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [mandalFilter, setMandalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [projectId, setProjectId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [facilityType, setFacilityType] = useState("PHC");
  const [serviceCategory, setServiceCategory] = useState("Standard");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [search, projectFilter, mandalFilter, categoryFilter, statusFilter, page]);

  async function fetchMetadata() {
    try {
      const [projRes, manRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/mandals?status=active&limit=200"),
      ]);
      const projData = await projRes.json();
      const manData = await manRes.json();

      if (projRes.ok && projData.success) {
        setProjects(projData.items || []);
        if (projData.items?.length > 0 && !projectId) {
          setProjectId(projData.items[0].id);
        }
      }
      if (manRes.ok && manData.success) {
        setAllMandals(manData.items || []);
      }
    } catch {
      // Ignored
    }
  }

  async function fetchFacilities() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (projectFilter) params.set("projectId", projectFilter);
      if (mandalFilter) params.set("mandalId", mandalFilter);
      if (categoryFilter) params.set("serviceCategory", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/facilities?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load facilities");

      setFacilities(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / 15) || 1);
      setTotalCount(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter mandals according to the currently selected project in the form
  const availableMandalsForForm = allMandals.filter(
    (m) => !projectId || m.projectId === projectId || m.project?.id === projectId
  );

  // Filter mandals for filter dropdown
  const availableMandalsForFilter = allMandals.filter(
    (m) => !projectFilter || m.projectId === projectFilter || m.project?.id === projectFilter
  );

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setCode("");
    const defaultProjId = projects.length > 0 ? projects[0].id : "";
    setProjectId(defaultProjId);

    const firstMandal = allMandals.find(
      (m) => !defaultProjId || m.projectId === defaultProjId || m.project?.id === defaultProjId
    );
    setMandalId(firstMandal ? firstMandal.id : "");
    setFacilityType("PHC");
    setServiceCategory("Standard");
    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function openEditForm(facility) {
    setEditingId(facility.id);
    setName(facility.name);
    setCode(facility.code);
    const pId = facility.projectId || facility.project?.id || "";
    setProjectId(pId);
    setMandalId(facility.mandalId || facility.mandal?.id || "");
    setFacilityType(facility.facilityType || "PHC");
    setServiceCategory(facility.serviceCategory || "Standard");
    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  // When project changes in form, auto-adjust mandal if invalid
  function handleProjectChange(newProjId) {
    setProjectId(newProjId);
    const validMandals = allMandals.filter(
      (m) => !newProjId || m.projectId === newProjId || m.project?.id === newProjId
    );
    if (!validMandals.some((m) => m.id === mandalId)) {
      setMandalId(validMandals.length > 0 ? validMandals[0].id : "");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionMessage("");

    try {
      const url = editingId ? `/api/admin/facilities/${editingId}` : "/api/admin/facilities";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        projectId,
        mandalId,
        facilityType,
        serviceCategory,
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

      setActionMessage(editingId ? "Facility updated successfully." : "Facility created successfully.");
      setIsFormOpen(false);
      fetchFacilities();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(facility) {
    const nextStatus = facility.status === "active" ? "inactive" : "active";
    const confirmMsg =
      nextStatus === "inactive"
        ? `Are you sure you want to deactivate ${facility.name}? Historical records will remain intact.`
        : `Activate ${facility.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/facilities/${facility.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Status update failed");

      setActionMessage(`Facility ${nextStatus === "active" ? "activated" : "deactivated"} successfully.`);
      fetchFacilities();
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
                placeholder="Search by facility name or code..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <Button onClick={openCreateForm} variant="primary" className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>Add Facility</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setMandalFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
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
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Mandals</option>
                {availableMandalsForFilter.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Service Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Deep-dive">Deep-dive</option>
                <option value="Light-touch">Light-touch</option>
                <option value="Standard">Standard</option>
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

      {/* Facilities Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Primary Health Centres & Facilities ({totalCount})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Master directory of AH, CHC, and PHC healthcare units
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="mt-2 text-xs">Loading facilities...</p>
            </div>
          ) : facilities.length === 0 ? (
            <div className="p-12 text-center">
              <BuildingIcon className="mx-auto w-10 h-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No Facilities Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || projectFilter || mandalFilter || categoryFilter || statusFilter
                  ? "Try resetting your search or filters to see more results."
                  : "No facility records have been created yet. Click 'Add Facility' to create one."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Facility Name & Code</th>
                    <th className="px-6 py-3 font-semibold">Project & Mandal</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facilities.map((fac) => {
                    const isDeepDive = fac.serviceCategory === "Deep-dive";
                    const isLightTouch = fac.serviceCategory === "Light-touch";

                    return (
                      <tr key={fac.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-900">{fac.name}</div>
                          <div className="text-[11px] font-mono text-emerald-700 font-medium">
                            {fac.code}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-slate-800">
                            {fac.mandal?.name || "Mandal N/A"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fac.project?.name || "Project N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {fac.facilityType || "PHC"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isDeepDive
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : isLightTouch
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {fac.serviceCategory}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant={fac.status === "active" ? "success" : "neutral"} size="sm">
                            {fac.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => openEditForm(fac)}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium text-xs transition-colors"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => toggleStatus(fac)}
                            className={`font-medium text-xs transition-colors ${
                              fac.status === "active"
                                ? "text-rose-600 hover:text-rose-800"
                                : "text-emerald-600 hover:text-emerald-800"
                            }`}
                          >
                            {fac.status === "active" ? "Deactivate" : "Activate"}
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
                  {editingId ? "Edit Facility" : "Add New Facility"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingId ? "Update facility information" : "Register a new healthcare facility"}
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
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Araku AH, Tajangi PHC"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Facility Code *
                </label>
                <input
                  type="text"
                  required
                  pattern="^[A-Za-z0-9_-]+$"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FAC-ARAKU-AH"
                  className="w-full rounded-xl border border-slate-300 font-mono px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Uppercase alphanumeric identifier, unique across facilities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Associated Project *
                  </label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="" disabled>
                      Select Project
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
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
                    onChange={(e) => setMandalId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="" disabled>
                      Select Mandal
                    </option>
                    {availableMandalsForForm.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="PHC">PHC (Primary Health Centre)</option>
                    <option value="AH">AH (Area Hospital)</option>
                    <option value="CHC">CHC (Community Health Centre)</option>
                    <option value="Sub-Center">Sub-Center</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Category
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deep-dive">Deep-dive</option>
                    <option value="Light-touch">Light-touch</option>
                  </select>
                </div>
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
                  {editingId ? "Update Facility" : "Create Facility"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
