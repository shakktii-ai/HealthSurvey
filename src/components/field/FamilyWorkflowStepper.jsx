"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  ActivityIcon,
  FolderIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/common/Icons";
import AddStakeholderModal from "@/components/common/AddStakeholderModal";

const STATUS_VARIANTS = {
  completed: { variant: "success", label: "Completed" },
  in_progress: { variant: "warning", label: "In Progress" },
  pending: { variant: "neutral", label: "Pending" },
  not_required: { variant: "info", label: "Not Required" },
};

export default function FamilyWorkflowStepper({ assignmentId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState(null);

  // Modal State for "Mark Not Required"
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTaskKey, setSelectedTaskKey] = useState("");
  const [selectedTaskTitle, setSelectedTaskTitle] = useState("");
  const [notRequiredReason, setNotRequiredReason] = useState("");
  const [submittingNotRequired, setSubmittingNotRequired] = useState(false);
  const [modalError, setModalError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modal State for "+ Add Stakeholder"
  const [addStakeholderOpen, setAddStakeholderOpen] = useState(false);
  const [targetTask, setTargetTask] = useState(null);

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/field/family-workflow/${assignmentId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load family survey workflow");
      }

      setWorkflow(data.workflow);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkflow();
  }, [loadWorkflow]);

  // Open Not Required Modal
  const openNotRequiredModal = (taskKey, title) => {
    setSelectedTaskKey(taskKey);
    setSelectedTaskTitle(title);
    setNotRequiredReason("");
    setModalError("");
    setModalOpen(true);
  };

  // Submit Not Required
  const handleConfirmNotRequired = async () => {
    if (!notRequiredReason || notRequiredReason.trim().length < 5) {
      setModalError("Please provide an explanatory reason (at least 5 characters).");
      return;
    }

    try {
      setSubmittingNotRequired(true);
      setModalError("");

      const res = await fetch(`/api/field/family-workflow/${assignmentId}/not-required`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: selectedTaskKey,
          reason: notRequiredReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark task as not required");
      }

      setWorkflow(data.workflow);
      setActionSuccess(data.message || `Task marked as Not Required.`);
      setModalOpen(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSubmittingNotRequired(false);
    }
  };

  // Start Stakeholder Task (auto-link if needed)
  const handleStartTask = async (task) => {
    if (task.url) {
      router.push(task.url);
      return;
    }

    if (task.taskKey !== "family" && task.taskKey !== "light_touch" && !task.stakeholder) {
      openAddStakeholder(task);
      return;
    }

    // Provision or link task
    try {
      const res = await fetch(`/api/field/family-workflow/${assignmentId}/link-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskKey: task.taskKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to prepare interview session");
      }
      if (data.url) {
        router.push(data.url);
      } else {
        loadWorkflow();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLinkExistingStakeholder = async (taskKey, stakeholderId) => {
    try {
      const res = await fetch(`/api/field/family-workflow/${assignmentId}/link-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskKey, stakeholderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to link stakeholder");
      }
      setActionSuccess("Stakeholder linked successfully to interview workflow.");
      await loadWorkflow();
    } catch (err) {
      setError(err.message);
    }
  };

  const openAddStakeholder = (task) => {
    setTargetTask(task);
    setAddStakeholderOpen(true);
  };

  const handleStakeholderCreated = async (newStakeholder) => {
    if (targetTask && newStakeholder?.id) {
      await handleLinkExistingStakeholder(targetTask.taskKey, newStakeholder.id);
    } else {
      await loadWorkflow();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <Card className="animate-pulse h-32 bg-slate-100" />
        <Card className="animate-pulse h-64 bg-slate-100" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Card className="border-rose-200 bg-rose-50/50 p-6">
          <h3 className="text-base font-bold text-rose-800">Cannot Load Family Workflow</h3>
          <p className="text-xs text-rose-600 mt-1">{error || "Workflow data unavailable."}</p>
          <div className="pt-4">
            <Button size="sm" variant="outline" onClick={() => router.push("/field/assignments")}>
              ← Return to My Assignments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { family, project, surveyRound, assignment, tasks, nextTask, isRoundCompleted, completionSummary } = workflow;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 text-slate-800">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess("")}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Banner */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary" size="sm">
                  {project.code}
                </Badge>
                <Badge variant="outline" size="sm" className="text-teal-200 border-teal-400/40">
                  Round: {surveyRound.name} ({surveyRound.code})
                </Badge>
                {surveyRound.enableLightTouch ? (
                  <span className="text-[11px] bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded font-medium">
                    Phone Follow-up Enabled
                  </span>
                ) : (
                  <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">
                    Field Visit Protocol
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Family Workflow:</span>
                <span className="font-mono text-emerald-400">{family.familyCode}</span>
              </h1>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Household Head: <strong className="text-white">{family.householdHeadName}</strong></span>
                <span>•</span>
                <span>Village: <strong>{family.village}</strong></span>
                <span>•</span>
                <span>Mandal: <strong>{family.mandal}</strong></span>
                <span>•</span>
                <span>PHC: <strong>{family.facility}</strong></span>
              </div>
            </div>

            {/* Overall Round Status Badge */}
            <div className="shrink-0 flex flex-col items-end">
              <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold mb-1">
                Round Status
              </div>
              {isRoundCompleted ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>Completed</span>
                </div>
              ) : assignment.roundStatus === "in_progress" ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs">
                  <ClockIcon className="w-4 h-4 text-amber-400" />
                  <span>In Progress</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/60 border border-slate-600 text-slate-300 font-bold text-xs">
                  <span>Pending Start</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              Tasks: <strong className="text-slate-900">{completionSummary.completed}</strong> of {completionSummary.total} Completed
            </span>
            {completionSummary.notRequired > 0 && (
              <span className="text-slate-500">
                ({completionSummary.notRequired} Marked Not Required)
              </span>
            )}
          </div>
          <Link href="/field/assignments" className="text-teal-700 hover:text-teal-900 font-semibold">
            ← Back to Assignment List
          </Link>
        </div>
      </Card>

      {/* Next Applicable Task Callout */}
      {nextTask && !isRoundCompleted && (
        <Card className="border-teal-200 bg-teal-50/60 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">Current Required Action</Badge>
                <span className="font-bold text-slate-900 text-sm">{nextTask.title}</span>
              </div>
              <p className="text-xs text-slate-600">
                Follow the family survey sequence. Complete this task next to advance the round towards completion.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                variant="primary"
                size="sm"
                className="text-xs"
                onClick={() => handleStartTask(nextTask)}
              >
                <span>{nextTask.status === "in_progress" ? "Resume Task →" : "Start Task →"}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Complete Celebration */}
      {isRoundCompleted && (
        <Card className="border-emerald-200 bg-emerald-50/70 p-5 shadow-xs text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-base">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            <span>Survey Round Fully Completed!</span>
          </div>
          <p className="text-xs text-emerald-700 max-w-xl mx-auto">
            All required household and stakeholder tasks for family {family.familyCode} under survey round {surveyRound.name} have been successfully verified and completed with complete audit integrity.
          </p>
        </Card>
      )}

      {/* 5-Step Sequential Workflow Stepper */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">
          Sequential Questionnaire Tasks
        </h2>

        {tasks.map((t, idx) => {
          const cfg = STATUS_VARIANTS[t.status] || { variant: "neutral", label: t.status };
          const isDone = t.status === "completed";
          const isInProgress = t.status === "in_progress";
          const isNotRequired = t.status === "not_required";
          const isPending = t.status === "pending";

          return (
            <Card
              key={t.taskKey}
              className={`p-4 transition-all shadow-xs ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/20"
                  : isInProgress
                  ? "border-amber-300 bg-amber-50/20"
                  : isNotRequired
                  ? "border-slate-200 bg-slate-50/70 opacity-80"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left Step Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isInProgress
                        ? "bg-amber-500 text-white"
                        : isNotRequired
                        ? "bg-slate-300 text-slate-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.title}</span>
                      <Badge variant={cfg.variant} size="sm">
                        {cfg.label}
                      </Badge>
                      {t.isShared && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
                          Shared Stakeholder
                        </span>
                      )}
                    </div>

                    {/* Metadata & Sub-details */}
                    {t.taskKey === "family" && (
                      <div className="text-xs text-slate-600">
                        Household: <strong>{family.householdHeadName}</strong> ({family.familyCode}) • Village: {family.village}
                      </div>
                    )}

                    {/* Stakeholder Details or Selection */}
                    {t.taskKey !== "family" && t.taskKey !== "light_touch" && (
                      <div className="pt-1.5">
                        {t.stakeholder ? (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                                  {t.stakeholder.name ? t.stakeholder.name.charAt(0) : "S"}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">{t.stakeholder.name}</span>
                                  <span className="text-slate-500 ml-1.5">({t.stakeholder.designation})</span>
                                  {t.stakeholder.phone && (
                                    <span className="text-slate-400 ml-2 font-mono">••••••</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openAddStakeholder(t)}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                              >
                                <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                <span>+ Add Stakeholder</span>
                              </button>
                            </div>

                            {t.availableStakeholders && t.availableStakeholders.length > 1 && (
                              <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/60">
                                <span className="text-[11px] text-slate-500 shrink-0">Switch:</span>
                                <select
                                  value={t.stakeholder.id}
                                  onChange={(e) => handleLinkExistingStakeholder(t.taskKey, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-hidden focus:border-emerald-500"
                                >
                                  {t.availableStakeholders.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.designation})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-semibold text-amber-900">
                                No {t.title} assigned in this catchment
                              </span>
                              <button
                                type="button"
                                onClick={() => openAddStakeholder(t)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs inline-flex items-center gap-1 transition-colors"
                              >
                                <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>+ Add Stakeholder</span>
                              </button>
                            </div>
                            {t.availableStakeholders && t.availableStakeholders.length > 0 ? (
                              <div className="flex items-center gap-2 pt-1">
                                <label className="text-slate-600 shrink-0 text-[11px]">Or select existing:</label>
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) handleLinkExistingStakeholder(t.taskKey, e.target.value);
                                  }}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                >
                                  <option value="" disabled>Choose existing stakeholder...</option>
                                  {t.availableStakeholders.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.designation})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <p className="text-[11px] text-amber-800">
                                Click &ldquo;+ Add Stakeholder&rdquo; to register and link the stakeholder directly.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {t.isShared && t.sharedNote && (
                      <div className="text-[11px] text-slate-500 italic">
                        {t.sharedNote}
                      </div>
                    )}

                    {/* Not Required Reason */}
                    {isNotRequired && t.notRequiredReason && (
                      <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2 mt-1">
                        <strong>Reason:</strong> {t.notRequiredReason}
                      </div>
                    )}

                    {/* Completion Stamp */}
                    {isDone && t.submittedAt && (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>Completed: {new Date(t.submittedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                  {isPending && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs py-1 px-3"
                        onClick={() => handleStartTask(t)}
                      >
                        Start Interview →
                      </Button>
                      {t.taskKey !== "family" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1 px-2 text-slate-600"
                          onClick={() => openNotRequiredModal(t.taskKey, t.title)}
                        >
                          Mark Inapplicable
                        </Button>
                      )}
                    </>
                  )}

                  {isInProgress && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs py-1 px-3"
                        onClick={() => handleStartTask(t)}
                      >
                        Resume Draft →
                      </Button>
                      {t.taskKey !== "family" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1 px-2 text-slate-600"
                          onClick={() => openNotRequiredModal(t.taskKey, t.title)}
                        >
                          Mark Inapplicable
                        </Button>
                      )}
                    </>
                  )}

                  {isDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs py-1 px-2.5 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      onClick={() => handleStartTask(t)}
                    >
                      ✓ View Submission
                    </Button>
                  )}

                  {isNotRequired && t.taskKey !== "family" && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => openAddStakeholder(t)}
                      >
                        + Add Stakeholder
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] py-0.5 px-2 text-slate-500"
                        onClick={() => openNotRequiredModal(t.taskKey, t.title)}
                      >
                        Edit Reason
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Mark Not Required Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Mark ${selectedTaskTitle} as Not Required`}
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Legitimately inapplicable questionnaires can be marked <strong>Not Required</strong> so that the round can complete without leaving unfinished bottlenecks.
          </p>

          {modalError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-semibold">
              {modalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">
              Operational Justification / Reason *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Remote tribal habitation with no resident ASHA worker assigned; coverage handled at cluster PHC."
              value={notRequiredReason}
              onChange={(e) => setNotRequiredReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-slate-400">
              This reason will be permanently recorded in the immutable audit trail.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submittingNotRequired}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={submittingNotRequired}
              onClick={handleConfirmNotRequired}
            >
              {submittingNotRequired ? "Saving..." : "Confirm Not Required"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inline Add Stakeholder Modal */}
      {targetTask && (
        <AddStakeholderModal
          isOpen={addStakeholderOpen}
          onClose={() => {
            setAddStakeholderOpen(false);
            setTargetTask(null);
          }}
          defaultValues={{
            projectId: workflow?.project?.id || workflow?.project?._id,
            mandalId: workflow?.family?.mandalId,
            facilityId: workflow?.family?.facilityId,
            villageId: workflow?.family?.villageId,
            familyId: workflow?.family?.id,
            stakeholderType:
              targetTask.category === "govt_official"
                ? "government_official"
                : targetTask.category || "asha",
            designation:
              targetTask.category === "asha"
                ? "ASHA Worker"
                : targetTask.category === "facility_staff"
                ? "Medical Officer"
                : "Government Official",
          }}
          lockGeography={true}
          onStakeholderCreated={handleStakeholderCreated}
        />
      )}
    </div>
  );
}
