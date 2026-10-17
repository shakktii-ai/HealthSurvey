"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { FolderIcon, PlusIcon, EditIcon, CheckCircleIcon, AlertCircleIcon, SearchIcon } from "@/components/common/Icons";

export default function ProjectManager() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Create/Edit form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  async function fetchProjects() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/projects?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load projects");
      setProjects(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function openEditForm(project) {
    setEditingId(project.id);
    setName(project.name);
    setCode(project.code);
    setDescription(project.description || "");
    setStartDate(project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "");
    setEndDate(project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "");
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
      const url = editingId ? `/api/admin/projects/${editingId}` : "/api/admin/projects";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        name,
        code,
        description,
        startDate,
        endDate: endDate || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || "Operation failed");

      setActionMessage(data.message || (editingId ? "Project updated" : "Project created"));
      setIsFormOpen(false);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setError("");
    setActionMessage("");

    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update status");

      setActionMessage(`Project status updated to ${newStatus}.`);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <Button variant="primary" size="sm" onClick={openCreateForm}>
          <PlusIcon className="w-4 h-4" /> Add New Project
        </Button>
      </div>

      {/* Modal / Form Drawer */}
      {isFormOpen && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">
                {editingId ? "Edit Project Details" : "Create New Project"}
              </CardTitle>
              <CardDescription className="text-xs">
                {editingId ? "Update existing project scope" : "Register an active survey project initiative"}
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Integrated Tribal Health & Nutrition Initiative"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingId)}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ITHNI-01"
                  className={`w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white uppercase focus:border-emerald-500 focus:outline-none ${editingId ? "bg-slate-100 cursor-not-allowed" : ""}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of project goals and fieldwork coverage..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Project" : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading projects...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No projects found. Click &quot;Add New Project&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {p.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"} to{" "}
                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : "Present"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={p.status === "active" ? "success" : "danger"} size="sm">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(p)}
                          className="font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.id, p.status)}
                          className={`font-semibold transition-colors ${
                            p.status === "active" ? "text-rose-600 hover:text-rose-800" : "text-emerald-600 hover:text-emerald-800"
                          }`}
                        >
                          {p.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
