"use client";

import { useState, useEffect, useCallback, useId } from "react";
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
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  ActivityIcon,
  FolderIcon,
} from "@/components/common/Icons";
import { shouldDisplayQuestion } from "@/utils/conditionEvaluator";

const CATEGORY_TITLES = {
  family: "Household Health Impact Survey",
  asha: "ASHA Stakeholder Interview",
  facility_staff: "Health Facility Staff Interview",
  light_touch: "Light-Touch Verification Phone Survey",
  govt_official: "Government Official Field Interview",
};

export default function SurveyExecutionForm({ taskId, taskType = "family", category = "" }) {
  const router = useRouter();

  // Session & Metadata State
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  // Form State
  const [answers, setAnswers] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentNotes, setConsentNotes] = useState("");
  const [language, setLanguage] = useState("en"); // 'en' | 'te'
  const [respondentName, setRespondentName] = useState("");

  // Actions & Progress State
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [draftSuccessMsg, setDraftSuccessMsg] = useState("");
  const [validationError, setValidationError] = useState("");

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  const consentId = useId();
  const consentNotesId = useId();
  const respondentNameId = useId();

  // Load Survey Data
  const loadSurveySession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const paramKey = taskType === "stakeholder" ? "stakeholderTaskId" : "assignmentId";
      const catQuery = category ? `&category=${encodeURIComponent(category)}` : "";
      const res = await fetch(`/api/field/survey-execution?${paramKey}=${taskId}${catQuery}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load survey questionnaire session");
      }

      setSessionData(data);
      setQuestions(data.questions || []);
      setAnswers(data.savedAnswers || {});
      setConsentGiven(!!data.consent?.consentGiven);
      setConsentNotes(data.consent?.notes || "");
      setLanguage(data.language || "en");
      if (data.response?.lastSavedAt) {
        setLastSavedTime(new Date(data.response.lastSavedAt).toLocaleTimeString());
      }
      if (data.task?.family?.householdHeadName) {
        setRespondentName(data.task.family.householdHeadName);
      } else if (data.task?.stakeholder?.fullName) {
        setRespondentName(data.task.stakeholder.fullName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId, taskType, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSurveySession();
  }, [loadSurveySession]);

  // Handle Answer Changes
  const handleAnswerChange = (questionCode, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionCode]: value,
    }));
    setValidationError("");
  };

  // Toggle Multiple Choice options
  const handleMultiChoiceToggle = (questionCode, optValue) => {
    const current = Array.isArray(answers[questionCode]) ? answers[questionCode] : [];
    let updated;
    if (current.includes(optValue)) {
      updated = current.filter((v) => v !== optValue);
    } else {
      updated = [...current, optValue];
    }
    handleAnswerChange(questionCode, updated);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setDraftSuccessMsg("");
      setValidationError("");

      const paramKey = taskType === "stakeholder" ? "stakeholderTaskId" : "assignmentId";
      const payload = {
        [paramKey]: taskId,
        category: category || sessionData?.category || "",
        answers,
        consent: {
          consentGiven,
          notes: consentNotes,
        },
        language,
        respondentName,
      };

      const res = await fetch("/api/field/survey-execution/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save draft");
      }

      setLastSavedTime(new Date().toLocaleTimeString());
      setDraftSuccessMsg(`Draft saved (${data.answersCount} answers recorded)`);
      setTimeout(() => setDraftSuccessMsg(""), 4000);
    } catch (err) {
      setValidationError(err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  // Validate for Review & Submit
  const handleOpenReview = () => {
    setValidationError("");

    // 1. Consent required
    if (!consentGiven) {
      setValidationError("Informed consent must be recorded before submitting the survey.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 2. Validate visible required questions
    for (const q of questions) {
      const isVisible = shouldDisplayQuestion(q, answers);
      if (isVisible && q.isRequired) {
        const val = answers[q.code];
        const isAnswered =
          val !== undefined &&
          val !== null &&
          val !== "" &&
          (!Array.isArray(val) || val.length > 0);

        if (!isAnswered) {
          const qText = language === "te" && q.text?.te ? q.text.te : q.text?.en;
          setValidationError(`Required question unanswered: "${qText}" (${q.code})`);
          return;
        }
      }
    }

    setIsReviewModalOpen(true);
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setValidationError("");

      const paramKey = taskType === "stakeholder" ? "stakeholderTaskId" : "assignmentId";
      const payload = {
        [paramKey]: taskId,
        category: category || sessionData?.category || "",
        answers,
        consent: {
          consentGiven: true,
          notes: consentNotes,
        },
        language,
        respondentName,
      };

      const res = await fetch("/api/field/survey-execution/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Submission failed");
      }

      setIsReviewModalOpen(false);
      setSubmittedReceipt({
        code: data.responseCode,
        submittedAt: data.submittedAt,
        message: data.message,
        nextTask: data.nextTask || null,
        isRoundCompleted: !!data.isRoundCompleted,
      });
    } catch (err) {
      setValidationError(err.message);
      setIsReviewModalOpen(false);
    } finally {
      setSubmitting(false);
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

  if (error || !sessionData) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Card className="border-rose-200 bg-rose-50/50 p-6">
          <h3 className="text-base font-bold text-rose-800">Cannot Load Survey</h3>
          <p className="text-xs text-rose-600 mt-1">{error || "Survey session unavailable."}</p>
          <div className="pt-4">
            <Button size="sm" variant="outline" onClick={() => router.push("/field/assignments")}>
              ← Return to My Assignments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Calculate progress
  const visibleQuestions = questions.filter((q) => shouldDisplayQuestion(q, answers));
  const answeredCount = visibleQuestions.filter((q) => {
    const v = answers[q.code];
    return v !== undefined && v !== null && v !== "" && (!Array.isArray(v) || v.length > 0);
  }).length;
  const progressPercent =
    visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;

  // If already submitted
  if (submittedReceipt || sessionData.task?.status === "completed") {
    const nextTask = submittedReceipt?.nextTask;
    const isRoundCompleted = submittedReceipt?.isRoundCompleted;

    return (
      <div className="max-w-xl mx-auto py-12 space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/40 p-8 text-center space-y-4 shadow-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircleIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Survey Completed & Submitted!</h2>
            <p className="text-xs text-emerald-700 mt-1">
              Field interview answers have been securely recorded and immutable snapshots generated.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Response Code:</span>
              <strong className="font-mono text-slate-800">
                {submittedReceipt?.code || sessionData.response?.responseCode || "COMPLETED"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Task Code:</span>
              <strong className="font-mono text-slate-800">{sessionData.task?.code}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Survey Round:</span>
              <span className="text-slate-700">{sessionData.surveyRound?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <Badge variant="success" size="sm">✓ Completed</Badge>
            </div>
          </div>

          {/* Next Applicable Task Guidance */}
          {nextTask && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">Next Required Step</Badge>
                <span className="text-xs font-bold text-teal-900">{nextTask.title}</span>
              </div>
              <p className="text-xs text-teal-700">
                Following the sequential family workflow, proceed now to complete the {nextTask.title}.
              </p>
              {nextTask.url && (
                <div className="pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push(nextTask.url)}
                  >
                    Proceed to {nextTask.title} →
                  </Button>
                </div>
              )}
            </div>
          )}

          {isRoundCompleted && (
            <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-xl text-center space-y-1">
              <div className="text-xs font-bold text-emerald-900">🎉 Survey Round Completed!</div>
              <p className="text-xs text-emerald-700">
                All applicable family and stakeholder tasks for this household round have been completed.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            {taskType === "family" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/field/workflow/${taskId}`)}
              >
                View Complete Family Workflow
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/field/assignments")}>
              ← Back to My Assignments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-slate-800">
      {/* Top Banner & Metadata */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary" size="sm">
                  {CATEGORY_TITLES[sessionData.category] || sessionData.category}
                </Badge>
                <span className="font-mono text-xs text-teal-300 font-bold">
                  {sessionData.task?.code}
                </span>
                <span className="text-xs text-slate-300">
                  • Round: {sessionData.surveyRound?.code} ({sessionData.surveyRound?.name})
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                {taskType === "family"
                  ? `Household: ${sessionData.task?.family?.familyCode} — ${sessionData.task?.family?.householdHeadName || "Head"}`
                  : `Stakeholder: ${sessionData.task?.stakeholder?.fullName} (${sessionData.task?.stakeholder?.designation || sessionData.task?.stakeholder?.type})`}
              </h2>
              {taskType === "family" && sessionData.task?.family?.village && (
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    Village: {sessionData.task.family.village}, Mandal: {sessionData.task.family.mandal}
                  </span>
                </p>
              )}
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  language === "en"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("te")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  language === "te"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                తెలుగు (Telugu)
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Interview Progress:</span>
            <span className="text-slate-500">
              {answeredCount} of {visibleQuestions.length} questions answered ({progressPercent}%)
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Global Alerts */}
      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <span>⚠️ {validationError}</span>
          <button
            onClick={() => setValidationError("")}
            className="text-rose-600 hover:text-rose-900 font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {draftSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>{draftSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: Respondent Consent Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800">
              1. Respondent Identity & Informed Consent
            </CardTitle>
            <Badge variant={consentGiven ? "success" : "danger"} size="sm">
              {consentGiven ? "Consent Granted" : "Consent Required"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Confirm respondent details and grant of informed verbal/written consent prior to data collection.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={respondentNameId} className="block font-medium text-slate-700 mb-1">
                Respondent Full Name *
              </label>
              <Input
                id={respondentNameId}
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Name of interviewee..."
                className="text-xs"
              />
            </div>

            <div>
              <label htmlFor={consentNotesId} className="block font-medium text-slate-700 mb-1">
                Surveyor Field Notes (Optional)
              </label>
              <Input
                id={consentNotesId}
                value={consentNotes}
                onChange={(e) => setConsentNotes(e.target.value)}
                placeholder="e.g. Interview conducted in presence of family elder"
                className="text-xs"
              />
            </div>
          </div>

          {/* Bilingual Consent Statement */}
          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 text-teal-950 space-y-1.5">
            <p className="font-semibold text-xs text-teal-900">
              {language === "te" ? "సమ్మతి ప్రకటన (Consent Declaration):" : "Consent Statement:"}
            </p>
            <p className="text-[11px] leading-relaxed text-teal-900">
              {language === "te"
                ? "ఈ ఆరోగ్య సర్వేలో పాల్గొనడానికి మరియు అందించిన ఆరోగ్య సమాచారాన్ని కుటుంబ ధృవీకరణ మరియు సేవల మెరుగుదల కొరకు ఉపయోగించడానికి నేను సమ్మతిస్తున్నాను."
                : "I agree to participate in this Health Survey and consent to the recording of household health and demographic data for verification and service improvement."}
            </p>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={consentId}
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor={consentId} className="font-bold text-slate-900 cursor-pointer text-xs">
                {language === "te"
                  ? "స్పందనదారుడు సమాచార సమ్మతిని ధృవీకరించారు (Respondent has granted informed consent)"
                  : "I confirm the respondent has granted informed consent to conduct this interview *"}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Dynamic Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900">
            2. Questionnaire Items ({visibleQuestions.length} Questions)
          </h3>
          <span className="text-[11px] text-slate-500">
            Language: <strong className="uppercase">{language}</strong>
          </span>
        </div>

        {visibleQuestions.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-xs text-slate-500">
              No questions configured for this survey round and category.
            </p>
          </Card>
        ) : (
          visibleQuestions.map((q, idx) => {
            const qText = language === "te" && q.text?.te ? q.text.te : q.text?.en;
            const subText = language === "te" && q.text?.en ? q.text.en : q.text?.te;
            const currentVal = answers[q.code];
            const hasCondition = Array.isArray(q.conditions) && q.conditions.length > 0;

            return (
              <Card
                key={q.id || q._id}
                className="border-slate-200 hover:border-slate-300 transition-colors shadow-xs"
              >
                <CardContent className="p-5 space-y-3">
                  {/* Question Title & Code Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          Q{idx + 1}. {q.code}
                        </span>
                        {q.indicator && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            [{q.indicator}]
                          </span>
                        )}
                        {q.isRequired && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Required
                          </span>
                        )}
                        {hasCondition && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            Conditional
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 pt-1 leading-snug">
                        {qText}
                      </h4>
                      {subText && (
                        <p className="text-xs text-slate-500 italic">{subText}</p>
                      )}
                    </div>
                  </div>

                  {/* Form Control based on answerType */}
                  <div className="pt-2">
                    {/* Yes / No */}
                    {q.answerType === "yes_no" && (
                      <div className="flex gap-2">
                        {["Yes", "No"].map((choice) => {
                          const isSelected = String(currentVal) === choice;
                          return (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => handleAnswerChange(q.code, choice)}
                              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                                isSelected
                                  ? choice === "Yes"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-slate-800 text-white border-slate-800 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Single Choice / Dropdown */}
                    {(q.answerType === "single_choice" || q.answerType === "dropdown") && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt) => {
                          const optLabel = language === "te" && opt.textTe ? opt.textTe : opt.textEn;
                          const isSelected = String(currentVal) === opt.value;
                          return (
                            <label
                              key={opt.code || opt.value}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-medium"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.code}`}
                                value={opt.value}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.code, opt.value)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />
                              <span>{optLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Multiple Choice */}
                    {q.answerType === "multiple_choice" && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt) => {
                          const optLabel = language === "te" && opt.textTe ? opt.textTe : opt.textEn;
                          const isChecked =
                            Array.isArray(currentVal) && currentVal.includes(opt.value);
                          return (
                            <label
                              key={opt.code || opt.value}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-medium"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={isChecked}
                                onChange={() => handleMultiChoiceToggle(q.code, opt.value)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />
                              <span>{optLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Text */}
                    {q.answerType === "short_text" && (
                      <Input
                        value={currentVal || ""}
                        onChange={(e) => handleAnswerChange(q.code, e.target.value)}
                        placeholder="Type answer here..."
                        className="text-xs"
                      />
                    )}

                    {/* Long Text */}
                    {q.answerType === "long_text" && (
                      <textarea
                        value={currentVal || ""}
                        onChange={(e) => handleAnswerChange(q.code, e.target.value)}
                        placeholder="Detailed observations and responses..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    )}

                    {/* Number */}
                    {q.answerType === "number" && (
                      <Input
                        type="number"
                        value={currentVal ?? ""}
                        onChange={(e) => handleAnswerChange(q.code, e.target.value)}
                        placeholder="Enter numerical value..."
                        className="text-xs sm:w-1/2"
                      />
                    )}

                    {/* Date */}
                    {q.answerType === "date" && (
                      <Input
                        type="date"
                        value={currentVal || ""}
                        onChange={(e) => handleAnswerChange(q.code, e.target.value)}
                        className="text-xs sm:w-1/2"
                      />
                    )}

                    {/* Rating Scale (1 to 5) */}
                    {q.answerType === "rating_scale" && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = Number(currentVal) === star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleAnswerChange(q.code, star)}
                              className={`w-10 h-10 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center ${
                                isSelected
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              ★ {star}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 sm:px-6 shadow-lg backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            {lastSavedTime && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Last saved: {lastSavedTime}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingDraft}
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5"
            >
              <ActivityIcon className="w-4 h-4 text-slate-500" />
              <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenReview}
              className="flex items-center gap-1.5 font-bold"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Review & Submit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* REVIEW & CONFIRM MODAL */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review & Confirm Survey Submission"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please verify the answers recorded with the respondent before final submission.
          </p>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div>
              Target: <strong>{sessionData.task?.code}</strong> ({sessionData.category})
            </div>
            <div>
              Respondent: <strong>{respondentName || "N/A"}</strong> (Consent Recorded)
            </div>
            <div>
              Round: <strong>{sessionData.surveyRound?.name}</strong>
            </div>
          </div>

          {/* Answers Summary Table */}
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
            {visibleQuestions.map((q) => {
              const val = answers[q.code];
              const displayVal = Array.isArray(val)
                ? val.join(", ")
                : val === null || val === undefined || val === ""
                ? "(Unanswered)"
                : String(val);
              return (
                <div key={q.code} className="p-2.5 flex justify-between gap-4">
                  <div className="space-y-0.5 max-w-[65%]">
                    <span className="font-mono text-[10px] text-slate-400">{q.code}</span>
                    <p className="font-medium text-slate-800 line-clamp-2">{q.text?.en}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {displayVal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsReviewModalOpen(false)}>
              ← Back to Edit
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="font-bold"
            >
              {submitting ? "Submitting..." : "Confirm & Finalize Submission"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
