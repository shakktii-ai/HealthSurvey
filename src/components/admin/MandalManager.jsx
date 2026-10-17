"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPinIcon, PlusIcon, CheckCircleIcon, AlertCircleIcon, SearchIcon } from "@/components/common/Icons";

export default function MandalManager() {
  const [mandals, setMandals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectsList();
  }, []);

  useEffect(() => {
    fetchMandals();
  }, [search, projectFilter, statusFilter]);

  async function fetchProjectsList() {
    try {
      const res = await fetch("/api/admin/projects?status=active&limit=100");
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(data.items || []);
        if (data.items?.length > 0 && !projectId) {
          setProjectId(data.items[0].id);
        }
      }
    } catch {
      // Ignored
    }
  }

  async function fetchMandals() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (projectFilter) params.set("projectId", projectFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/mandals?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load mandals");
      setMandals(data.items || []);
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
    if (projects.length > 0) setProjectId(projects[0].id);
    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function openEditForm(mandal) {
    setEditingId(mandal.id);
    setName(mandal.name);
    setCode(mandal.code);
    setProjectId(mandal.projectId || (mandal.project?.id || ""));
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
      const url = editingId ? `/api/admin/mandals/${editingId}` : "/api/admin/mandals";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        name: name.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
        projectId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || "Operation failed");

      setActionMessage(data.message || (editingId ? "Mandal updated" : "Mandal created"));
      setIsFormOpen(false);
      fetchMandals();
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
      const res = await fetch(`/api/admin/mandals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update status");

      setActionMessage(`Mandal status updated to ${newStatus}.`);
      fetchMandals();
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

      {/* Action Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search Mandal name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

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
          <PlusIcon className="w-4 h-4" /> Add New Mandal
        </Button>
      </div>

      {/* Form Drawer */}
      {isFormOpen && (
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">
                {editingId ? "Edit Mandal" : "Add New Mandal"}
              </CardTitle>
              <CardDescription className="text-xs">
                {editingId ? "Update Mandal name or parent project" : "Create a new administrative Mandal in the survey hierarchy"}
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="e.g. ARAKU VALLEY"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandal Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingId)}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MAN-ARAKU-VALLEY"
                  className={`w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white uppercase focus:border-emerald-500 focus:outline-none ${editingId ? "bg-slate-100 cursor-not-allowed" : ""}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associated Project <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Mandal" : "Create Mandal"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mandals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-3">Mandal Name</th>
                  <th className="py-2.5 px-3">Associated Project</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading Mandals...
                    </td>
                  </tr>
                ) : mandals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No Mandals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  mandals.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.code}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {m.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {m.project?.name || "ITHNI-01"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={m.status === "active" ? "success" : "danger"} size="sm">
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(m)}
                          className="font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m.id, m.status)}
                          className={`font-semibold transition-colors ${
                            m.status === "active" ? "text-rose-600 hover:text-rose-800" : "text-emerald-600 hover:text-emerald-800"
                          }`}
                        >
                          {m.status === "active" ? "Deactivate" : "Activate"}
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
