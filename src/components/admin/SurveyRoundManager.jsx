"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  CalendarIcon,
  PlusIcon,
  EditIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  PhoneIcon,
  FolderIcon,
} from "@/components/common/Icons";

const STATUS_VARIANTS = {
  planned: "neutral",
  active: "success",
  completed: "info",
  cancelled: "danger",
};

export default function SurveyRoundManager() {
  const [rounds, setRounds] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Filter
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [targetTiming, setTargetTiming] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [enableLightTouch, setEnableLightTouch] = useState(false);
  const [description, setDescription] = useState("");

  // Attach Questions Modal State
  const [attachModalRound, setAttachModalRound] = useState(null);
  const [attachCategory, setAttachCategory] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, statusFilter]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/admin/projects?status=active&limit=100");
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(data.items || []);
      }
    } catch {
      // Ignored
    }
  }

  async function fetchRounds() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("projectId", projectFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/survey-rounds?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load survey rounds");
      }
      setRounds(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setProjectId(projects[0]?.id || "");
    setName("");
    setCode("");
    setTargetTiming("");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setStatus("planned");
    setEnableLightTouch(false);
    setDescription("");
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(round) {
    setEditingId(round.id || round._id);
    setProjectId(round.projectId || round.project?._id || round.project?.id || "");
    setName(round.name || "");
    setCode(round.code || "");
    setTargetTiming(round.targetTiming || "");
    setPlannedStartDate(round.plannedStartDate ? round.plannedStartDate.slice(0, 10) : "");
    setPlannedEndDate(round.plannedEndDate ? round.plannedEndDate.slice(0, 10) : "");
    setStatus(round.status || "planned");
    setEnableLightTouch(Boolean(round.enableLightTouch));
    setDescription(round.description || "");
    setError("");
    setIsModalOpen(true);
  }

  async function handleBulkAttachQuestions() {
    if (!attachModalRound) return;
    setIsAttaching(true);
    setError("");
    setActionMessage("");
    try {
      const payload = {
        roundIds: [attachModalRound.id || attachModalRound._id],
        action: "add",
        projectId:
          attachModalRound.projectId ||
          attachModalRound.project?._id ||
          attachModalRound.project?.id ||
          attachModalRound.project,
      };
      if (attachCategory) {
        payload.category = attachCategory;
      }
      const res = await fetch("/api/admin/questions/bulk-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to attach questions to round");
      }
      setActionMessage(data.message || `Attached questions to round ${attachModalRound.code}`);
      setAttachModalRound(null);
      fetchRounds();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAttaching(false);
    }
  }

  function handleQuickTemplate(templateCode, templateName, timing) {
    setCode(templateCode);
    setName(templateName);
    setTargetTiming(timing);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionMessage("");

    if (!projectId) {
      setError("Please select a project.");
      setIsSubmitting(false);
      return;
    }
    if (!name.trim()) {
      setError("Please enter a round name.");
      setIsSubmitting(false);
      return;
    }
    if (!code.trim()) {
      setError("Please enter a round code.");
      setIsSubmitting(false);
      return;
    }
    if (plannedStartDate && plannedEndDate && plannedEndDate < plannedStartDate) {
      setError("Planned end date cannot be earlier than planned start date.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        projectId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        targetTiming: targetTiming.trim(),
        plannedStartDate: plannedStartDate || null,
        plannedEndDate: plannedEndDate || null,
        status,
        enableLightTouch,
        description: description.trim(),
      };

      const url = editingId ? `/api/admin/survey-rounds/${editingId}` : "/api/admin/survey-rounds";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save survey round.");
      }

      setActionMessage(editingId ? "Survey round updated successfully." : "Survey round created successfully.");
      setIsModalOpen(false);
      fetchRounds();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Actions & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Survey Rounds Management</h2>
          <p className="text-xs text-slate-500">
            Configure Baseline (M0), Midline (M3), Endline (M6), and custom milestone survey rounds.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal} className="flex items-center gap-1.5 shrink-0">
          <PlusIcon className="w-4 h-4" />
          <span>New Survey Round</span>
        </Button>
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[200px]">
          <select
            id="filter-project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium ml-auto">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"} found
        </div>
      </div>

      {/* Survey Rounds Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-slate-100" />
          ))}
        </div>
      ) : rounds.length === 0 ? (
        <Card className="text-center py-12 px-4 border-dashed border-slate-300">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No Survey Rounds Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Create baseline (M0), midline (M3), or endline (M6) survey rounds to map questionnaire modules.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              Create First Round
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.map((round) => (
            <Card key={round.id} className="hover:border-slate-300 transition-shadow shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      {round.code}
                    </span>
                    <Badge variant={STATUS_VARIANTS[round.status] || "neutral"} size="sm">
                      {round.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(round)}
                    className="h-7 px-2 text-xs"
                    title="Edit round configuration"
                  >
                    <EditIcon className="w-3.5 h-3.5 mr-1" />
                    <span>Edit</span>
                  </Button>
                </div>
                <CardTitle className="text-base text-slate-900 mt-2 font-bold">{round.name}</CardTitle>
                <CardDescription className="text-xs text-slate-500 line-clamp-2">
                  {round.project?.name || "Project initiative"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {round.targetTiming && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Target Timing: <strong>{round.targetTiming}</strong></span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {round.plannedStartDate ? new Date(round.plannedStartDate).toLocaleDateString() : "No start"}
                    {" → "}
                    {round.plannedEndDate ? new Date(round.plannedEndDate).toLocaleDateString() : "No end"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 font-medium">
                      Questions: <strong className="text-slate-800">{round.questionCount || 0}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachModalRound(round);
                        setAttachCategory("");
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>+ Bulk Attach</span>
                    </button>
                  </div>
                  {round.enableLightTouch ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <PhoneIcon className="w-3 h-3 text-emerald-600" />
                      Light-Touch Enabled
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">Light-touch off</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? "Edit Survey Round" : "Create New Survey Round"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure round milestone, dates, and category scope.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-700 flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Quick Preset Buttons (if creating new) */}
              {!editingId && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Quick Standard Milestone Presets:</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickTemplate("M0", "Baseline Survey", "Month 0 (M0)")}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 transition-colors"
                    >
                      Baseline (M0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickTemplate("M3", "Midline Follow-up Survey", "Month 3 (M3)")}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 transition-colors"
                    >
                      Midline (M3)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickTemplate("M6", "Endline Impact Evaluation", "Month 6 (M6)")}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 transition-colors"
                    >
                      Endline (M6)
                    </button>
                  </div>
                </div>
              )}

              {/* Project Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Project Initiative *</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={Boolean(editingId)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Round Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Round Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="M0, M3, M6"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700">Round Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Baseline Health Survey"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Target Timing & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Target Timing / Milestone</label>
                  <input
                    type="text"
                    placeholder="e.g. Month 0, Q1 2026"
                    value={targetTiming}
                    onChange={(e) => setTargetTiming(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Round Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Planned Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Planned Start Date</label>
                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Planned End Date</label>
                  <input
                    type="date"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Light-touch Category Toggle */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enableLightTouch"
                  checked={enableLightTouch}
                  onChange={(e) => setEnableLightTouch(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <label htmlFor="enableLightTouch" className="font-semibold text-slate-800 cursor-pointer">
                    Enable Light-touch Phone Call Category
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When enabled, phone-based short follow-up questions can be configured and administered for this round.
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional operational notes or catchment instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update Round" : "Create Round"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK ATTACH QUESTIONS MODAL */}
      {attachModalRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white">
              <div>
                <h3 className="font-bold text-sm">Bulk Attach Questions to Round</h3>
                <p className="text-[11px] text-teal-300">
                  Round: {attachModalRound.code} — {attachModalRound.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachModalRound(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-600">
                Attach questions to this survey round in bulk so field workers can execute surveys under round{" "}
                <strong>{attachModalRound.code}</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Filter Category (Optional)</label>
                <select
                  value={attachCategory}
                  onChange={(e) => setAttachCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Categories (Attach All Project Questions)</option>
                  <option value="family">Household Health Impact Survey (family)</option>
                  <option value="asha">ASHA Stakeholder Interview (asha)</option>
                  <option value="facility_staff">Health Facility Staff Interview (facility_staff)</option>
                  <option value="govt_official">Government Official Interview (govt_official)</option>
                  <option value="light_touch">Light-Touch Verification (light_touch)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {attachCategory
                    ? `Only active '${attachCategory}' questions will be attached to round ${attachModalRound.code}.`
                    : `All active questions in this project will be attached to round ${attachModalRound.code}.`}
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold">✓ Safe Bulk Operation</div>
                <p className="text-[11px] text-emerald-800">
                  Existing survey round mappings on the questions are preserved; round{" "}
                  <strong>{attachModalRound.code}</strong> will be added without duplicates.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAttachModalRound(null)}
                disabled={isAttaching}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isAttaching}
                onClick={handleBulkAttachQuestions}
                className="font-bold"
              >
                {isAttaching ? "Attaching..." : `Attach Questions to ${attachModalRound.code}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
