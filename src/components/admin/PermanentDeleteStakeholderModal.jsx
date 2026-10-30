"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  AlertCircleIcon,
  TrashIcon,
  CheckCircleIcon,
  UsersIcon,
  StethoscopeIcon,
  ClipboardIcon,
  CloseIcon,
  ShieldCheckIcon,
} from "@/components/common/Icons";

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

export default function PermanentDeleteStakeholderModal({
  stakeholder,
  isOpen,
  onClose,
  onDeleted,
}) {
  const [loading, setLoading] = useState(true);
  const [dependencyData, setDependencyData] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "details"

  // Confirmation state
  const [confirmationInput, setConfirmationInput] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const stakeholderId = stakeholder?.id || stakeholder?._id;

  const retryFetch = useCallback(() => {
    if (!stakeholderId) return;
    setLoading(true);
    setFetchError("");
    setDeleteError("");

    fetch(`/api/admin/stakeholders/${stakeholderId}/dependencies`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success) {
          throw new Error(data.error || "Failed to analyze dependencies");
        }
        setDependencyData(data);
      })
      .catch((err) => {
        setFetchError(err.message || "Failed to retrieve stakeholder dependencies");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stakeholderId]);

  useEffect(() => {
    let ignore = false;
    if (!isOpen || !stakeholderId) return;

    fetch(`/api/admin/stakeholders/${stakeholderId}/dependencies`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ignore) return;
        if (!ok || !data.success) {
          throw new Error(data.error || "Failed to analyze dependencies");
        }
        setDependencyData(data);
        setFetchError("");
      })
      .catch((err) => {
        if (!ignore) {
          setFetchError(err.message || "Failed to retrieve stakeholder dependencies");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, stakeholderId]);

  if (!isOpen || !stakeholder) return null;

  const isConfirmed = confirmationInput.trim() === "DELETE";

  const cfg = TYPE_CONFIG[stakeholder.stakeholderType] || {
    label: stakeholder.stakeholderType,
    badgeClass: "bg-slate-100 text-slate-700",
  };

  const counts = dependencyData?.summary?.counts || {
    linkedFamilies: 0,
    doctorInterviews: 0,
    stakeholderTasks: 0,
    surveyResponses: 0,
    assignments: 0,
    dataQualityIssues: 0,
  };

  const totalLinked = dependencyData?.summary?.totalLinkedRecords || 0;
  const recordsToDelete = dependencyData?.summary?.recordsToDeleteCount || 1;

  async function handleExecuteDelete(e) {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admin/stakeholders/${stakeholderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "DELETE",
          reason: deletionReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Permanent deletion failed");
      }

      if (onDeleted) {
        onDeleted(data);
      }
      onClose();
    } catch (err) {
      setDeleteError(err.message || "An unexpected error occurred during permanent deletion");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="permanent-delete-title"
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 p-6 text-white border-b border-rose-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 shrink-0">
              <TrashIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm" className="bg-rose-500/30 text-rose-200 border-rose-400/30">
                  Critical Administrative Action
                </Badge>
                <span className="text-xs text-rose-200">Superadmin Only</span>
              </div>
              <h3 id="permanent-delete-title" className="text-lg font-bold text-white mt-1">
                Permanent Stakeholder Deletion
              </h3>
              <p className="text-xs text-slate-300">
                Inspect dependencies and confirm irreversible deletion from all systems.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-white text-xl p-1 rounded-lg transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Stakeholder Identity Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">{stakeholder.fullName}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {stakeholder.designation ? `${stakeholder.designation} • ` : ""}
              {stakeholder.facility?.name ? `${stakeholder.facility.name} • ` : ""}
              {stakeholder.mandal?.name || stakeholder.mandal || "Jurisdiction N/A"} •{" "}
              {stakeholder.project?.name || stakeholder.project || "Project"}
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Linked</span>
              <span className="text-sm font-bold text-slate-800">{totalLinked} records</span>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-rose-600 block">Purged</span>
              <span className="text-sm font-bold text-rose-700">{recordsToDelete} to delete</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-rose-600 border-t-transparent" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Running relationship-aware dependency analysis...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Checking Family, DoctorInterview, StakeholderTask, SurveyResponse, and DataQuality models
              </p>
            </div>
          ) : fetchError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold">Unable to analyze dependencies</h5>
                  <p className="text-xs mt-1 text-rose-700">{fetchError}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={retryFetch}
                    className="mt-3 text-rose-800 hover:bg-rose-100"
                  >
                    Retry Analysis
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "summary"
                      ? "bg-rose-100 text-rose-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dependency Summary & Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "details"
                      ? "bg-rose-100 text-rose-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Affected Record Details ({totalLinked})
                </button>
              </div>

              {activeTab === "summary" ? (
                <div className="space-y-6">
                  {/* Collection-wise Dependency Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Collection-Wise Impact Analysis
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* 1. Linked Families */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Linked Families</span>
                          <UsersIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.linkedFamilies}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Preserved • Unlinked
                        </span>
                      </div>

                      {/* 2. Doctor Interviews */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Doctor Interviews</span>
                          <StethoscopeIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.doctorInterviews}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            counts.doctorInterviews > 0
                              ? "text-rose-700 bg-rose-50 border-rose-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {counts.doctorInterviews > 0 ? "Will Be Deleted" : "None Linked"}
                        </span>
                      </div>

                      {/* 3. Stakeholder Tasks */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Stakeholder Tasks</span>
                          <ClipboardIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.stakeholderTasks}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            counts.stakeholderTasks > 0
                              ? "text-rose-700 bg-rose-50 border-rose-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {counts.stakeholderTasks > 0 ? "Will Be Deleted" : "None Linked"}
                        </span>
                      </div>

                      {/* 4. Survey Responses */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Survey Responses</span>
                          <ClipboardIcon className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.surveyResponses}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            counts.surveyResponses > 0
                              ? "text-rose-700 bg-rose-50 border-rose-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {counts.surveyResponses > 0 ? "Will Be Deleted" : "None Linked"}
                        </span>
                      </div>

                      {/* 5. Family Assignments */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Family Assignments</span>
                          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.assignments}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Preserved Intact
                        </span>
                      </div>

                      {/* 6. Data Quality Issues */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Quality Issues</span>
                          <AlertCircleIcon className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.dataQualityIssues}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            counts.dataQualityIssues > 0
                              ? "text-rose-700 bg-rose-50 border-rose-200"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {counts.dataQualityIssues > 0 ? "Will Be Deleted" : "None Linked"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Section Clear Explanation Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Will Be Deleted */}
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <span className="h-2 w-2 rounded-full bg-rose-600" />
                        <span>Will Be Permanently Deleted</span>
                      </div>
                      <ul className="list-disc list-inside text-rose-900 space-y-1">
                        {dependencyData?.rules?.willBeDeleted?.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Relationships Removed */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <span className="h-2 w-2 rounded-full bg-amber-600" />
                        <span>Relationships Safely Removed</span>
                      </div>
                      <ul className="list-disc list-inside text-amber-900 space-y-1">
                        {dependencyData?.rules?.willBeUnlinked?.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Preserved Intact */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span>Strictly Preserved Intact</span>
                      </div>
                      <ul className="list-disc list-inside text-emerald-900 space-y-1">
                        {dependencyData?.rules?.willBePreserved?.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Detailed Record Listings */
                <div className="space-y-4">
                  {/* Linked Families list */}
                  {dependencyData?.details?.linkedFamilies?.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Linked Families ({dependencyData.details.linkedFamilies.length})</span>
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PRESERVED (will unlink reference)
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dependencyData.details.linkedFamilies.map((fam) => (
                          <div key={fam.id} className="py-1.5 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-slate-900">{fam.familyCode}</span>
                              <span className="text-slate-600 ml-2">{fam.householdHeadName}</span>
                              <span className="text-slate-400 ml-1">({fam.villageName})</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Role: {fam.relationship}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctor Interviews list */}
                  {dependencyData?.details?.doctorInterviews?.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Doctor Interviews ({dependencyData.details.doctorInterviews.length})</span>
                        <span className="text-[10px] font-normal text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          WILL BE PERMANENTLY DELETED
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dependencyData.details.doctorInterviews.map((iv) => (
                          <div key={iv.id} className="py-1.5 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-purple-800">{iv.interviewCode}</span>
                              <span className="text-slate-500 ml-2">
                                {iv.interviewDate ? new Date(iv.interviewDate).toLocaleDateString() : ""}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              <span>Status: {iv.status}</span> •{" "}
                              <span>{iv.linkedFamiliesCount} linked families</span> •{" "}
                              <span>{iv.answersCount} answers</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stakeholder Tasks list */}
                  {dependencyData?.details?.stakeholderTasks?.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Stakeholder Tasks ({dependencyData.details.stakeholderTasks.length})</span>
                        <span className="text-[10px] font-normal text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          WILL BE PERMANENTLY DELETED
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dependencyData.details.stakeholderTasks.map((t) => (
                          <div key={t.id} className="py-1.5 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-blue-800">{t.taskCode}</span>
                              <span className="text-slate-600 ml-2">Category: {t.category}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              <span>Round: {t.roundCode}</span> • <span>Worker: {t.workerName}</span> •{" "}
                              <span>Status: {t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Survey Responses list */}
                  {dependencyData?.details?.surveyResponses?.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Survey Responses ({dependencyData.details.surveyResponses.length})</span>
                        <span className="text-[10px] font-normal text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          WILL BE PERMANENTLY DELETED
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {dependencyData.details.surveyResponses.map((r) => (
                          <div key={r.id} className="py-1.5 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-amber-800">{r.responseCode}</span>
                              <span className="text-slate-600 ml-2">Category: {r.category}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              <span>Round: {r.roundCode}</span> • <span>Worker: {r.workerName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalLinked === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No linked records found. This stakeholder is completely unlinked and safe to delete immediately.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Delete Error Callout */}
          {deleteError && (
            <div className="rounded-xl border border-rose-300 bg-rose-100/70 p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Deletion Aborted: </span>
                <span>{deleteError}</span>
              </div>
            </div>
          )}

          {/* Deletion Form & Double Confirmation Input */}
          <form id="permanent-delete-form" onSubmit={handleExecuteDelete} className="space-y-4 pt-2 border-t border-slate-200">
            {/* Optional Reason for Audit Log */}
            <div>
              <label htmlFor="deletion-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Permanent Deletion (Recorded in Audit Trail)
              </label>
              <input
                id="deletion-reason"
                type="text"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="e.g. Stakeholder relocated, duplicate registry, contract ended..."
                disabled={isDeleting || loading}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Permanent Warning */}
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Irreversible Master Data Operation</p>
                  <p className="text-[11px] text-rose-700">
                    This action will permanently delete the stakeholder record and all associated interviews, tasks,
                    and responses from MongoDB. Shared family master records will have their relationship unlinked and
                    will be preserved. This operation cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation typing field */}
            <div>
              <label htmlFor="confirm-delete-input" className="block text-xs font-bold text-slate-800 mb-1">
                To confirm permanent deletion, type <span className="font-mono text-rose-600 select-all font-black">DELETE</span> below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                autoComplete="off"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Type DELETE to enable confirmation"
                disabled={isDeleting || loading}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:ring-2 ${
                  isConfirmed
                    ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20 font-bold"
                    : "border-slate-300 text-slate-800 focus:border-slate-500 focus:ring-slate-400/20"
                }`}
              />
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between bg-slate-50 border-t border-slate-200 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="permanent-delete-form"
            disabled={!isConfirmed || isDeleting || loading}
            isLoading={isDeleting}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              isConfirmed && !isDeleting && !loading
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
            }`}
          >
            <TrashIcon className="w-4 h-4 mr-1.5" />
            <span>Permanently Delete Stakeholder</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

