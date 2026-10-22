"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  ClipboardIcon,
  ShieldCheckIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  FolderIcon,
} from "@/components/common/Icons";

export default function SurveyResponseInspector({ responseId }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [piiRevealed, setPiiRevealed] = useState(false);
  const [revealingPii, setRevealingPii] = useState(false);

  // Amendment modal state
  const [amendModalOpen, setAmendModalOpen] = useState(false);
  const [amendAnswers, setAmendAnswers] = useState({});
  const [amendReason, setAmendReason] = useState("");
  const [confirmAmendStep, setConfirmAmendStep] = useState(false);
  const [submittingAmend, setSubmittingAmend] = useState(false);

  const fetchResponseDetails = useCallback(async (reveal = false) => {
    setLoading(true);
    setError("");

    try {
      const q = reveal ? "?revealSensitive=true" : "";
      const res = await fetch(`/api/admin/survey-responses/${responseId}${q}`);
      const data = await res.json();

      if (data.success && data.item) {
        setResponse(data.item);
        setPiiRevealed(reveal);

        // Pre-fill answer state for amendment form
        const initialAnswers = {};
        if (Array.isArray(data.item.answers)) {
          for (const a of data.item.answers) {
            initialAnswers[a.questionCode] = a.value;
          }
        }
        setAmendAnswers(initialAnswers);
      } else {
        setError(data.error || "Failed to load survey response.");
      }
    } catch (err) {
      console.error("Fetch response error:", err);
      setError("Network error while connecting to survey responses service.");
    } finally {
      setLoading(false);
      setRevealingPii(false);
    }
  }, [responseId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResponseDetails(false);
  }, [fetchResponseDetails]);

  const handleTogglePii = () => {
    if (piiRevealed) {
      fetchResponseDetails(false);
    } else {
      if (confirm("Revealing unmasked personal information will be permanently recorded in the administrative audit trail. Do you wish to proceed?")) {
        setRevealingPii(true);
        fetchResponseDetails(true);
      }
    }
  };

  const handleAnswerChange = (qCode, value) => {
    setAmendAnswers((prev) => ({
      ...prev,
      [qCode]: value,
    }));
  };

  const handleAmendSubmit = async () => {
    if (!amendReason || amendReason.trim().length < 5) {
      setError("An explicit correction reason of at least 5 characters is required.");
      return;
    }

    setSubmittingAmend(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/survey-responses/${responseId}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: amendAnswers,
          reason: amendReason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Survey response amended successfully. New revision: v${data.revision}.`);
        setAmendModalOpen(false);
        setConfirmAmendStep(false);
        setAmendReason("");
        fetchResponseDetails(piiRevealed);
      } else {
        setError(data.error || "Failed to amend response.");
      }
    } catch (err) {
      console.error("Amend error:", err);
      setError("Network error during response amendment.");
    } finally {
      setSubmittingAmend(false);
    }
  };

  if (loading && !response) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Loading survey response inspection details...
      </div>
    );
  }

  if (error && !response) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/survey-responses"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Back to Submissions
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePii}
            disabled={revealingPii}
            className={`text-xs ${
              piiRevealed
                ? "border-amber-300 text-amber-800 bg-amber-50"
                : "border-slate-300 text-slate-700"
            }`}
          >
            {piiRevealed ? "Hide Sensitive PII" : "Reveal Sensitive PII (Audited)"}
          </Button>

          {response.status !== "draft" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAmendModalOpen(true);
                setConfirmAmendStep(false);
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              Amend Submission
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
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

      {/* Linked Data Quality Alerts Banner */}
      {Array.isArray(response.linkedIssues) && response.linkedIssues.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircleIcon className="w-4 h-4 text-amber-600" />
            <span>Active Data Quality Issues Detected on this Response ({response.linkedIssues.length})</span>
          </div>
          <div className="space-y-1">
            {response.linkedIssues.map((iss) => (
              <div key={iss._id || iss.issueCode} className="flex items-center gap-2 text-[11px]">
                <Badge variant="warning" size="sm">{iss.severity}</Badge>
                <span className="font-semibold">{iss.issueCode}:</span>
                <span>{iss.description}</span>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <Link href="/admin/data-quality" className="text-emerald-800 font-semibold underline text-[11px]">
              View all issues in Data Quality Manager →
            </Link>
          </div>
        </div>
      )}

      {/* Response Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Metadata */}
        <Card className="border-slate-200 md:col-span-2">
          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-mono font-bold text-base text-slate-900">
                {response.responseCode}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={response.status === "submitted" ? "primary" : response.status === "amended" ? "secondary" : "warning"} size="sm">
                  {response.status}
                </Badge>
                <Badge variant="outline" size="sm">Revision {response.revision || 1}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project</span>
                <span className="font-semibold text-slate-800">{response.project?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Survey Round</span>
                <span className="font-semibold text-slate-800">{response.surveyRound?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                <span className="font-semibold text-slate-800 capitalize">{response.category?.replace(/_/g, " ")}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Field Worker</span>
                <span className="font-semibold text-slate-800">{response.fieldWorker?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Language</span>
                <span className="font-semibold text-slate-800 uppercase">{response.language}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submitted At</span>
                <span className="font-semibold text-slate-800">
                  {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : "Not submitted"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Entity / Respondent */}
        <Card className="border-slate-200">
          <CardContent className="p-5 space-y-3 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <UsersIcon className="w-4 h-4 text-emerald-600" />
              <span>Target Household / Respondent</span>
            </h4>

            {response.family ? (
              <div className="space-y-1.5 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Family Code</span>
                  <span className="font-mono font-bold text-slate-900">{response.family.familyCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Household Head</span>
                  <span className="font-semibold text-slate-800">{response.family.householdHeadName}</span>
                </div>
                {response.assignment && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assignment Code</span>
                    <span className="font-mono text-slate-700">{response.assignment.assignmentCode}</span>
                  </div>
                )}
              </div>
            ) : response.stakeholder ? (
              <div className="space-y-1.5 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stakeholder</span>
                  <span className="font-bold text-slate-900">{response.stakeholder.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Designation</span>
                  <span className="text-slate-700">{response.stakeholder.designation || response.stakeholder.stakeholderType}</span>
                </div>
                {response.stakeholderTask && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Task Code</span>
                    <span className="font-mono text-slate-700">{response.stakeholderTask.taskCode}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500">
                Respondent: {response.respondentName || "N/A"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informed Consent Card */}
      <Card className="border-slate-200">
        <CardContent className="p-5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
              <span>Informed Consent Record</span>
            </h4>
            <Badge variant={response.consent?.consentGiven ? "primary" : "danger"} size="sm">
              {response.consent?.consentGiven ? "Consent Recorded" : "Consent Missing"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 pt-1">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Recorded At</span>
              <span>
                {response.consent?.consentTimestamp ? new Date(response.consent.consentTimestamp).toLocaleString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Language</span>
              <span className="uppercase">{response.consent?.consentLanguage || response.language}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Notes</span>
              <span>{response.consent?.notes || "None"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Snapshots & Recorded Responses */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-slate-800 text-sm">
              Recorded Question Responses ({response.answers?.length || 0})
            </h4>
            <span className="text-slate-400 text-[11px]">
              Active Snapshot v{response.revision || 1}
            </span>
          </div>

          <div className="space-y-3">
            {(!response.answers || response.answers.length === 0) ? (
              <div className="py-6 text-center text-slate-400">
                No answers recorded for this response.
              </div>
            ) : (
              response.answers.map((ans, idx) => (
                <div
                  key={ans.questionCode || idx}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          {ans.questionCode}
                        </span>
                        <span className="text-slate-400 text-[10px] uppercase">
                          {ans.answerType}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          ver {ans.versionNumber || 1}
                        </span>
                      </div>
                      <div className="font-medium text-slate-900 pt-1">
                        {ans.questionTextSnapshot?.en || ans.questionCode}
                      </div>
                      {ans.questionTextSnapshot?.te && (
                        <div className="text-[11px] text-slate-500 font-telugu">
                          {ans.questionTextSnapshot.te}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-500 font-semibold text-[11px] block mb-1">Recorded Value:</span>
                    {ans.answerType === "image" || (ans.value && typeof ans.value === "object" && ans.value.url) ? (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-h-48 w-full sm:w-64 flex items-center justify-center">
                          <a href={ans.value?.url || ans.value} target="_blank" rel="noreferrer" className="block w-full h-full">
                            <img
                              src={ans.value?.url || ans.value}
                              alt="Survey Evidence"
                              className="max-h-48 w-full object-contain hover:opacity-95 transition"
                            />
                          </a>
                        </div>
                        {ans.value?.geotag && (
                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                            <span className="font-semibold text-emerald-700">
                              ?? GPS: {ans.value.geotag.latitude?.toFixed(5)}, {ans.value.geotag.longitude?.toFixed(5)}
                            </span>
                            {ans.value.geotag.accuracy && (
                              <span className="text-slate-400">
                                (�{Math.round(ans.value.geotag.accuracy)}m)
                              </span>
                            )}
                            <a
                              href={`https://www.google.com/maps?q=${ans.value.geotag.latitude},${ans.value.geotag.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-semibold ml-auto"
                            >
                              Open in Maps ?
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs inline-block">
                        {Array.isArray(ans.value)
                          ? ans.value.join(", ")
                          : ans.value === true
                          ? "Yes"
                          : ans.value === false
                          ? "No"
                          : String(ans.value ?? "N/A")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historical Revision History */}
      {Array.isArray(response.revisionHistory) && response.revisionHistory.length > 0 && (
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 space-y-4 text-xs">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-teal-600" />
              <span>Audited Revision History ({response.revisionHistory.length})</span>
            </h4>

            <div className="space-y-3">
              {response.revisionHistory.map((rev, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" size="sm">Historical Rev v{rev.revision}</Badge>
                      <span className="text-slate-500">
                        {new Date(rev.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      Amended by: {rev.amendedBy?.name || rev.amendedBy?.email || "Admin"}
                    </span>
                  </div>
                  <div className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900">Correction Reason: </span>
                    <span>{rev.reason}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Answers recorded at this revision: {rev.answers?.length || 0} fields
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Administrative Amendment */}
      {amendModalOpen && (
        <Modal
          isOpen={amendModalOpen}
          onClose={() => setAmendModalOpen(false)}
          title={`Amend Survey Submission: ${response.responseCode}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {!confirmAmendStep ? (
              <>
                <p className="text-slate-600">
                  Update survey response values below. The current response will be archived into revision history and a new revision (v{(response.revision || 1) + 1}) will be created.
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                  {response.answers?.map((ans) => (
                    <div key={ans.questionCode} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                      <div className="flex justify-between text-slate-700 font-semibold">
                        <span>{ans.questionTextSnapshot?.en || ans.questionCode}</span>
                        <span className="font-mono text-[10px] text-slate-400">{ans.questionCode}</span>
                      </div>
                      <input
                        type="text"
                        value={amendAnswers[ans.questionCode] !== undefined ? amendAnswers[ans.questionCode] : ""}
                        onChange={(e) => handleAnswerChange(ans.questionCode, e.target.value)}
                        className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white text-slate-900 focus:outline-emerald-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    Correction Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide explicit reason for this post-submission correction..."
                    value={amendReason}
                    onChange={(e) => setAmendReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Required: minimum 5 characters.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmendModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!amendReason || amendReason.trim().length < 5}
                    onClick={() => setConfirmAmendStep(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Next: Review & Confirm →
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircleIcon className="w-4 h-4 text-amber-700" />
                    <span>Second Confirmation Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    You are applying an official correction to submission <strong>{response.responseCode}</strong>.
                    This will increment the revision number to <strong>v{(response.revision || 1) + 1}</strong> and log an immutable entry into the administrative audit trail.
                  </p>
                  <div className="text-[11px] pt-1">
                    <strong>Reason:</strong> <em>{amendReason}</em>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmAmendStep(false)}
                    disabled={submittingAmend}
                  >
                    ← Back to Edit
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={submittingAmend}
                    onClick={handleAmendSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submittingAmend ? "Applying Correction..." : "Confirm & Save Amendment"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
