"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  QuestionMarkCircleIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  HistoryIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CalendarIcon,
  FolderIcon,
} from "@/components/common/Icons";
import {
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONNAIRE_CATEGORY_LABELS,
  ANSWER_TYPES,
  ANSWER_TYPE_LABELS,
  QUESTION_STATUSES,
  CONDITIONAL_OPERATORS,
} from "@/utils/constants";
import { evaluateCondition } from "@/utils/conditionEvaluator";

const KNOWN_CODES = {
  family: ["B1", "B2", "FP-1", "FP-2", "FP-3", "F-C1", "F-C2", "F-C3", "F-C4", "F-C5", "F-C6", "F-C7", "F-C8", "F-C9"],
  asha: ["A-C1", "A-C2", "A-C3", "A-C4", "A-C5", "A-C6", "A-C7", "A-C8", "A-C9"],
  facility_staff: ["G-C1", "G-C2", "G-C3", "G-C4", "G-C5", "G-C6", "G-C7", "G-C8", "G-C9"],
  light_touch: ["L-C3", "L-C4", "L-C5", "L-C6"],
  govt_official: ["GO-1", "GO-2", "GO-3", "GO-4", "GO-5"],
};

const CATEGORY_COLORS = {
  family: "bg-blue-50 text-blue-700 border-blue-200",
  asha: "bg-purple-50 text-purple-700 border-purple-200",
  facility_staff: "bg-teal-50 text-teal-700 border-teal-200",
  light_touch: "bg-amber-50 text-amber-800 border-amber-200",
  govt_official: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATUS_VARIANTS = {
  draft: "neutral",
  active: "success",
  archived: "danger",
};

export default function QuestionBankManager() {
  const [questions, setQuestions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [answerTypeFilter, setAnswerTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Messages
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Create / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formProject, setFormProject] = useState("");
  const [formCategory, setFormCategory] = useState("family");
  const [formCode, setFormCode] = useState("");
  const [formIndicator, setFormIndicator] = useState("");
  const [formTextEn, setFormTextEn] = useState("");
  const [formTextTe, setFormTextTe] = useState("");
  const [formAnswerType, setFormAnswerType] = useState("single_choice");
  const [formOptions, setFormOptions] = useState([
    { code: "yes", textEn: "Yes", textTe: "అవును", value: "yes" },
    { code: "no", textEn: "No", textTe: "కాదు", value: "no" },
  ]);
  const [formIsRequired, setFormIsRequired] = useState(true);
  const [formRounds, setFormRounds] = useState([]);
  const [formConditions, setFormConditions] = useState([]);
  const [formStatus, setFormStatus] = useState("draft");
  const [formChangeNote, setFormChangeNote] = useState("");

  // Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [simulatedAnswers, setSimulatedAnswers] = useState({});

  // Version History Modal State
  const [versionsModalQuestion, setVersionsModalQuestion] = useState(null);
  const [versionsList, setVersionsList] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, categoryFilter, roundFilter, statusFilter, answerTypeFilter, search, page]);

  async function fetchMetadata() {
    try {
      const [projRes, roundRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/survey-rounds?limit=100"),
      ]);

      const [projData, roundData] = await Promise.all([projRes.json(), roundRes.json()]);

      if (projRes.ok && projData.success) {
        setProjects(projData.items || []);
        if (!projectFilter && projData.items?.length > 0) {
          // Keep all projects filter by default
        }
      }
      if (roundRes.ok && roundData.success) {
        setRounds(roundData.items || []);
      }
    } catch {
      // Ignored
    }
  }

  async function fetchQuestions() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("projectId", projectFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (roundFilter) params.set("roundId", roundFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (answerTypeFilter) params.set("answerType", answerTypeFilter);
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load questions");
      }

      setQuestions(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    const defaultProj = projects[0]?.id || "";
    setFormProject(defaultProj);
    setFormCategory("family");
    setFormCode("");
    setFormIndicator("");
    setFormTextEn("");
    setFormTextTe("");
    setFormAnswerType("single_choice");
    setFormOptions([
      { code: "yes", textEn: "Yes", textTe: "అవును", value: "yes" },
      { code: "no", textEn: "No", textTe: "కాదు", value: "no" },
    ]);
    setFormIsRequired(true);
    // Select all rounds of default project by default
    const projRounds = rounds.filter((r) => (r.projectId || r.project?._id || r.project) === defaultProj);
    setFormRounds(projRounds.map((r) => r.id || r._id));
    setFormConditions([]);
    setFormStatus("draft");
    setFormChangeNote("");
    setError("");
    setIsFormOpen(true);
  }

  function openEditModal(q) {
    setEditingId(q.id || q._id);
    setFormProject(q.projectId || q.project?._id || q.project?.id || "");
    setFormCategory(q.category);
    setFormCode(q.code);
    setFormIndicator(q.indicator || "");
    setFormTextEn(q.text?.en || "");
    setFormTextTe(q.text?.te || "");
    setFormAnswerType(q.answerType);
    setFormOptions(
      q.options?.length > 0
        ? q.options.map((o) => ({ ...o }))
        : [
            { code: "yes", textEn: "Yes", textTe: "అవును", value: "yes" },
            { code: "no", textEn: "No", textTe: "కాదు", value: "no" },
          ]
    );
    setFormIsRequired(Boolean(q.isRequired));
    setFormRounds(
      Array.isArray(q.rounds)
        ? q.rounds.map((r) => (typeof r === "object" ? r.id || r._id : r))
        : []
    );
    setFormConditions(Array.isArray(q.conditions) ? q.conditions.map((c) => ({ ...c })) : []);
    setFormStatus(q.status);
    setFormChangeNote("");
    setError("");
    setIsFormOpen(true);
  }

  function handleSelectKnownCode(kCode) {
    setFormCode(kCode);
    if (!formIndicator) {
      if (kCode.startsWith("B")) setFormIndicator("Basic Household Verification");
      else if (kCode.startsWith("FP")) setFormIndicator("Family Profile & Priority Needs");
      else if (kCode.startsWith("F-C")) setFormIndicator("Family Health Experience");
      else if (kCode.startsWith("A-C")) setFormIndicator("ASHA Outreach & Village Observations");
      else if (kCode.startsWith("G-C")) setFormIndicator("Facility Operations & Essential Drugs");
      else if (kCode.startsWith("L-C")) setFormIndicator("Light-touch Telephonic Follow-up");
      else if (kCode.startsWith("GO-")) setFormIndicator("Government Administrative Oversight");
    }
  }

  function handleAddOption() {
    const idx = formOptions.length + 1;
    setFormOptions([
      ...formOptions,
      { code: `opt_${idx}`, textEn: `Option ${idx}`, textTe: "", value: `opt_${idx}` },
    ]);
  }

  function handleUpdateOption(index, field, value) {
    const next = [...formOptions];
    next[index] = { ...next[index], [field]: value };
    if (field === "textEn" && !next[index].code) {
      next[index].code = value.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      next[index].value = next[index].code;
    }
    setFormOptions(next);
  }

  function handleRemoveOption(index) {
    if (formOptions.length <= 2) {
      setError("At least 2 options are required for choice-based questions.");
      return;
    }
    setFormOptions(formOptions.filter((_, i) => i !== index));
  }

  function handleToggleRound(roundId) {
    if (formRounds.includes(roundId)) {
      setFormRounds(formRounds.filter((r) => r !== roundId));
    } else {
      setFormRounds([...formRounds, roundId]);
    }
  }

  // Conditional Logic Builder helpers
  const availableParentQuestions = questions.filter(
    (q) =>
      (q.id || q._id) !== editingId &&
      q.category === formCategory &&
      (q.projectId || q.project?._id || q.project?.id) === formProject
  );

  function handleAddCondition() {
    if (availableParentQuestions.length === 0) {
      setError("No other questions exist in this category to use as a conditional parent.");
      return;
    }
    const defaultParent = availableParentQuestions[0];
    setFormConditions([
      ...formConditions,
      {
        dependsOnQuestionId: defaultParent.id || defaultParent._id,
        dependsOnQuestionCode: defaultParent.code,
        operator: "equals",
        value: "yes",
      },
    ]);
  }

  function handleUpdateCondition(index, field, value) {
    const next = [...formConditions];
    if (field === "parentCode") {
      const parent = availableParentQuestions.find((q) => q.code === value);
      next[index] = {
        ...next[index],
        dependsOnQuestionCode: value,
        dependsOnQuestionId: parent ? parent.id || parent._id : null,
      };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setFormConditions(next);
  }

  function handleRemoveCondition(index) {
    setFormConditions(formConditions.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionMessage("");

    if (!formProject) {
      setError("Please select a project.");
      setIsSubmitting(false);
      return;
    }
    if (!formCode.trim()) {
      setError("Please enter a question code (e.g. B1, FP-1).");
      setIsSubmitting(false);
      return;
    }
    if (!formTextEn.trim()) {
      setError("English question text is required.");
      setIsSubmitting(false);
      return;
    }

    const choiceTypes = [
      ANSWER_TYPES.SINGLE_CHOICE,
      ANSWER_TYPES.MULTIPLE_CHOICE,
      ANSWER_TYPES.DROPDOWN,
    ];
    if (choiceTypes.includes(formAnswerType) && formOptions.length < 2) {
      setError("Choice-based questions require at least 2 answer options.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        projectId: formProject,
        category: formCategory,
        code: formCode.trim().toUpperCase(),
        indicator: formIndicator.trim(),
        text: {
          en: formTextEn.trim(),
          te: formTextTe.trim(),
        },
        answerType: formAnswerType,
        options: choiceTypes.includes(formAnswerType) ? formOptions : [],
        isRequired: formIsRequired,
        rounds: formRounds,
        conditions: formConditions,
        status: formStatus,
        changeNote: formChangeNote.trim(),
      };

      const url = editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save question.");
      }

      setActionMessage(
        editingId
          ? `Question ${data.item.code} updated (Version ${data.item.currentVersion}).`
          : `Question ${data.item.code} created successfully in ${data.item.status} status.`
      );
      setIsFormOpen(false);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(question) {
    if (
      !window.confirm(
        `Are you sure you want to archive question '${question.code}'? Archived questions can no longer be used in new surveys, but historical audit records will be preserved.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/questions/${question.id || question._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to archive question");
      }
      setActionMessage(`Question '${question.code}' archived successfully.`);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openVersionsModal(question) {
    setVersionsModalQuestion(question);
    setVersionsList([]);
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/questions/${question.id || question._id}/versions`);
      const data = await res.json();
      if (res.ok && data.success) {
        setVersionsList(data.items || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingVersions(false);
    }
  }

  function openPreviewModal(question) {
    setPreviewQuestion(question);
    setPreviewLanguage("en");
    setSimulatedAnswers({});
  }

  const projectRounds = rounds.filter(
    (r) => (r.projectId || r.project?._id || r.project) === formProject
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Actions & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Question Bank & Versioning</h2>
          <p className="text-xs text-slate-500">
            Define bilingual questions, dynamic answer types, branching rules, and version histories across categories.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal} className="flex items-center gap-1.5 shrink-0">
          <PlusIcon className="w-4 h-4" />
          <span>New Question</span>
        </Button>
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && !isFormOpen && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rich Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="search"
              placeholder="Search code or wording..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {Object.entries(QUESTIONNAIRE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Round Filter */}
          <select
            value={roundFilter}
            onChange={(e) => {
              setRoundFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Rounds</option>
            {rounds.map((r, rIdx) => (
              <option key={r.id || r._id || `opt-rnd-${rIdx}`} value={r.id || r._id}>
                {r.code} - {r.name}
              </option>
            ))}
          </select>

          {/* Status & Answer Type Filter */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-1/2 rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={answerTypeFilter}
              onChange={(e) => {
                setAnswerTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-1/2 rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Type</option>
              {Object.entries(ANSWER_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong>{questions.length}</strong> of <strong>{totalCount}</strong> questions
          </span>
          {categoryFilter && (
            <span className="font-semibold text-emerald-700">
              Filtered Category: {QUESTIONNAIRE_CATEGORY_LABELS[categoryFilter]}
            </span>
          )}
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-28 bg-slate-100" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card className="text-center py-12 px-4 border-dashed border-slate-300">
          <QuestionMarkCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No Questions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No questions match your current search or filters. Create a new question or adjust your filters above.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              Create Question
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const hasTelugu = Boolean(q.text?.te && q.text.te.trim());
            const hasConditions = Array.isArray(q.conditions) && q.conditions.length > 0;
            return (
              <Card
                key={q.id || q._id}
                className="hover:border-slate-300 transition-all shadow-xs overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Code, Category, Text */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold bg-slate-900 text-white px-2.5 py-0.5 rounded shadow-xs">
                        {q.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        v{q.currentVersion || 1}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          CATEGORY_COLORS[q.category] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {QUESTIONNAIRE_CATEGORY_LABELS[q.category] || q.category}
                      </span>
                      <Badge variant={STATUS_VARIANTS[q.status] || "neutral"} size="sm">
                        {q.status}
                      </Badge>
                      {q.isRequired ? (
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Optional</span>
                      )}
                    </div>

                    {/* Question text snippet */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {q.text?.en || "(No English wording configured)"}
                      </h4>
                      {hasTelugu ? (
                        <p className="text-xs text-slate-500 mt-1 font-serif line-clamp-1">
                          {q.text.te}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 mt-0.5 italic">
                          Telugu translation pending interpreter review
                        </p>
                      )}
                    </div>

                    {/* Meta info: Rounds, Answer Type, Conditions */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-500">
                      {q.indicator && (
                        <span>
                          Topic: <strong className="text-slate-700">{q.indicator}</strong>
                        </span>
                      )}

                      <span>
                        Type: <strong className="text-slate-700">{ANSWER_TYPE_LABELS[q.answerType] || q.answerType}</strong>
                        {q.options?.length > 0 && ` (${q.options.length} options)`}
                      </span>

                      {/* Rounds */}
                      {q.rounds?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Rounds:</span>
                          {Array.from(
                            new Map(
                              q.rounds.map((r, rIdx) => {
                                const key = r?._id || r?.id || r?.code || String(r) || rIdx;
                                return [key, r];
                              })
                            ).values()
                          ).map((r, rIdx) => {
                            const roundKey = r?._id || r?.id || r?.code || String(r) || rIdx;
                            return (
                              <span
                                key={`round-${q.id || q._id}-${roundKey}-${rIdx}`}
                                className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 border border-slate-200"
                              >
                                {r?.code || r}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Conditional indicator */}
                      {hasConditions && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Depends on {q.conditions.map((c) => `${c.dependsOnQuestionCode} ${c.operator} '${c.value}'`).join(" & ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center md:flex-col lg:flex-row gap-1.5 shrink-0 self-end md:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPreviewModal(q)}
                      className="h-8 text-xs px-2.5"
                      title="Preview question rendering and answer controls"
                    >
                      <EyeIcon className="w-3.5 h-3.5 mr-1" />
                      <span>Preview</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openVersionsModal(q)}
                      className="h-8 text-xs px-2.5"
                      title="View historical versions"
                    >
                      <HistoryIcon className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      <span>History</span>
                    </Button>

                    {q.status !== "archived" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(q)}
                        className="h-8 text-xs px-2.5"
                        title="Edit question"
                      >
                        <EditIcon className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        <span>Edit</span>
                      </Button>
                    )}

                    {q.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(q)}
                        className="h-8 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Archive question"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-slate-600">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT QUESTION MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <QuestionMarkCircleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? `Edit Question: ${formCode}` : "Create New Dynamic Question"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingId && formStatus === "active"
                      ? "Editing an active question will automatically publish a new version (v+1)."
                      : "Configure bilingual text, answer choices, and branching conditions."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-700 flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Project & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Project Initiative *</label>
                  <select
                    required
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    disabled={Boolean(editingId)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Questionnaire Category *</label>
                  <select
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={Boolean(editingId)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  >
                    {Object.entries(QUESTIONNAIRE_CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Code & Known Code Suggestions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Question Code *</label>
                  {!editingId && KNOWN_CODES[formCategory]?.length > 0 && (
                    <span className="text-[11px] text-slate-400">Known project codes:</span>
                  )}
                </div>

                {!editingId && KNOWN_CODES[formCategory]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {KNOWN_CODES[formCategory].map((kc) => (
                      <button
                        key={kc}
                        type="button"
                        onClick={() => handleSelectKnownCode(kc)}
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors ${
                          formCode === kc
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        {kc}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="e.g. B1, FP-1, F-C1"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Topic / Indicator (e.g. Healthcare Access)"
                    value={formIndicator}
                    onChange={(e) => setFormIndicator(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Bilingual Wording: English & Telugu */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">English Question Text *</label>
                    <span className="text-[10px] text-slate-400">Exact field survey wording</span>
                  </div>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter the official question prompt in English..."
                    value={formTextEn}
                    onChange={(e) => setFormTextEn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Telugu Translation (తెలుగు)</label>
                    <span className="text-[10px] text-amber-700 font-medium">Interpreter review recommended</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="ప్రశ్న యొక్క తెలుగు అనువాదం నమోదు చేయండి (ఆప్షనల్)..."
                    value={formTextTe}
                    onChange={(e) => setFormTextTe(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-serif"
                  />
                </div>
              </div>

              {/* Answer Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Answer Type *</label>
                  <select
                    value={formAnswerType}
                    onChange={(e) => setFormAnswerType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(ANSWER_TYPE_LABELS).map(([typeKey, typeLabel]) => (
                      <option key={typeKey} value={typeKey}>
                        {typeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Publication Status *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="draft">Draft (Work in progress)</option>
                    <option value="active">Active (Published for surveys)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Choice Options Builder */}
              {[ANSWER_TYPES.SINGLE_CHOICE, ANSWER_TYPES.MULTIPLE_CHOICE, ANSWER_TYPES.DROPDOWN].includes(
                formAnswerType
              ) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Answer Options</span>
                      <p className="text-[11px] text-slate-500">Provide at least 2 distinct choices.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="h-7 text-xs">
                      <PlusIcon className="w-3.5 h-3.5 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formOptions.map((opt, oIndex) => (
                      <div
                        key={oIndex}
                        className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
                      >
                        <span className="font-mono text-[10px] text-slate-400 w-5 text-center">
                          {oIndex + 1}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="English label *"
                          value={opt.textEn}
                          onChange={(e) => handleUpdateOption(oIndex, "textEn", e.target.value)}
                          className="flex-1 rounded border border-slate-200 py-1 px-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Telugu label (తెలుగు)"
                          value={opt.textTe || ""}
                          onChange={(e) => handleUpdateOption(oIndex, "textTe", e.target.value)}
                          className="flex-1 rounded border border-slate-200 py-1 px-2 text-xs font-serif"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={opt.value}
                          onChange={(e) => handleUpdateOption(oIndex, "value", e.target.value)}
                          className="w-24 rounded border border-slate-200 py-1 px-2 text-xs font-mono"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(oIndex)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove option"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applicable Survey Rounds */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Applicable Survey Rounds</label>
                {projectRounds.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No survey rounds configured yet for this project. Create rounds under Survey Rounds.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {projectRounds.map((r, rIdx) => {
                      const isChecked = formRounds.includes(r.id || r._id);
                      return (
                        <button
                          key={r.id || r._id || `proj-rnd-${r.code}-${rIdx}`}
                          type="button"
                          onClick={() => handleToggleRound(r.id || r._id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            isChecked
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono font-bold">{r.code}</span>
                          <span>({r.name})</span>
                          {isChecked && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Required Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formIsRequired"
                  checked={formIsRequired}
                  onChange={(e) => setFormIsRequired(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="formIsRequired" className="font-semibold text-slate-800 cursor-pointer">
                  Mandatory response (Required field in survey questionnaire)
                </label>
              </div>

              {/* Conditional Display Rules */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Conditional Display Rules</span>
                    <p className="text-[11px] text-slate-500">
                      Display this question only when prior questions meet specified answers.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                    className="h-7 text-xs"
                    disabled={availableParentQuestions.length === 0}
                  >
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    Add Rule
                  </Button>
                </div>

                {formConditions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Always displayed (no conditional rules applied).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formConditions.map((cond, cIndex) => (
                      <div
                        key={cIndex}
                        className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs"
                      >
                        <span className="text-slate-500 font-medium">Show if</span>
                        <select
                          value={cond.dependsOnQuestionCode}
                          onChange={(e) => handleUpdateCondition(cIndex, "parentCode", e.target.value)}
                          className="rounded border border-slate-300 py-1 px-2 font-mono"
                        >
                          {availableParentQuestions.map((pq) => (
                            <option key={pq.code} value={pq.code}>
                              {pq.code} - {pq.text?.en?.slice(0, 25)}...
                            </option>
                          ))}
                        </select>

                        <select
                          value={cond.operator}
                          onChange={(e) => handleUpdateCondition(cIndex, "operator", e.target.value)}
                          className="rounded border border-slate-300 py-1 px-2 font-medium"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Does not equal</option>
                          <option value="contains">Contains</option>
                          <option value="is_empty">Is Empty</option>
                          <option value="is_not_empty">Is Not Empty</option>
                        </select>

                        {!["is_empty", "is_not_empty"].includes(cond.operator) && (
                          <input
                            type="text"
                            placeholder="Expected answer (e.g. yes)"
                            value={cond.value}
                            onChange={(e) => handleUpdateCondition(cIndex, "value", e.target.value)}
                            className="w-32 rounded border border-slate-300 py-1 px-2"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cIndex)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded ml-auto"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Note (for Active Questions) */}
              {editingId && formStatus === "active" && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Version Change Note (Saved with Version Snapshot) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Added option for traditional healer; revised Telugu phrasing"
                    value={formChangeNote}
                    onChange={(e) => setFormChangeNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                    ? formStatus === "active"
                      ? "Publish New Version"
                      : "Save Changes"
                    : "Create Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE INTERACTIVE PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-xs">
                  {previewQuestion.code}
                </span>
                <span className="text-xs text-slate-500 font-medium">Questionnaire Field Simulator</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage("en")}
                    className={`px-2 py-0.5 rounded ${
                      previewLanguage === "en" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLanguage("te")}
                    className={`px-2 py-0.5 rounded ${
                      previewLanguage === "te" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                  >
                    తెలుగు
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewQuestion(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Question Header */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                    {previewQuestion.category}
                  </span>
                  {previewQuestion.isRequired && (
                    <span className="text-xs text-rose-600 font-bold">* Required</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {previewLanguage === "te" && previewQuestion.text?.te
                    ? previewQuestion.text.te
                    : previewQuestion.text?.en || "(No text)"}
                </h3>
                {previewLanguage === "te" && !previewQuestion.text?.te && (
                  <p className="text-xs text-amber-600 italic mt-1">
                    No Telugu translation provided. Showing English.
                  </p>
                )}
              </div>

              {/* Dynamic Answer Type Control */}
              <div className="pt-2">
                {previewQuestion.answerType === "short_text" && (
                  <input
                    type="text"
                    disabled
                    placeholder="Respondent answer..."
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm bg-slate-50 cursor-not-allowed"
                  />
                )}

                {previewQuestion.answerType === "long_text" && (
                  <textarea
                    rows={3}
                    disabled
                    placeholder="Detailed respondent notes..."
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm bg-slate-50 cursor-not-allowed"
                  />
                )}

                {previewQuestion.answerType === "number" && (
                  <input
                    type="number"
                    disabled
                    placeholder="0"
                    className="w-48 rounded-lg border border-slate-300 py-2 px-3 text-sm bg-slate-50 cursor-not-allowed"
                  />
                )}

                {previewQuestion.answerType === "date" && (
                  <input
                    type="date"
                    disabled
                    className="w-48 rounded-lg border border-slate-300 py-2 px-3 text-sm bg-slate-50 cursor-not-allowed"
                  />
                )}

                {previewQuestion.answerType === "yes_no" && (
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 w-32 cursor-pointer hover:bg-slate-50">
                      <input type="radio" name="preview_yn" defaultChecked className="text-emerald-600" />
                      <span>{previewLanguage === "te" ? "అవును" : "Yes"}</span>
                    </label>
                    <label className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 w-32 cursor-pointer hover:bg-slate-50">
                      <input type="radio" name="preview_yn" className="text-emerald-600" />
                      <span>{previewLanguage === "te" ? "కాదు" : "No"}</span>
                    </label>
                  </div>
                )}

                {previewQuestion.answerType === "dropdown" && (
                  <select disabled className="w-full rounded-lg border border-slate-300 py-2 px-3 bg-slate-50">
                    <option>Select an option</option>
                    {previewQuestion.options?.map((opt, i) => (
                      <option key={i}>
                        {previewLanguage === "te" && opt.textTe ? opt.textTe : opt.textEn}
                      </option>
                    ))}
                  </select>
                )}

                {previewQuestion.answerType === "single_choice" && (
                  <div className="space-y-2">
                    {previewQuestion.options?.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <input type="radio" name="preview_choice" defaultChecked={i === 0} className="text-emerald-600" />
                        <span>{previewLanguage === "te" && opt.textTe ? opt.textTe : opt.textEn}</span>
                      </label>
                    ))}
                  </div>
                )}

                {previewQuestion.answerType === "multiple_choice" && (
                  <div className="space-y-2">
                    {previewQuestion.options?.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <input type="checkbox" defaultChecked={i === 0} className="rounded text-emerald-600" />
                        <span>{previewLanguage === "te" && opt.textTe ? opt.textTe : opt.textEn}</span>
                      </label>
                    ))}
                  </div>
                )}

                {previewQuestion.answerType === "rating_scale" && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="w-10 h-10 rounded-lg border border-slate-200 font-bold hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conditional Display Simulator (if question has conditions) */}
              {previewQuestion.conditions?.length > 0 && (
                <div className="pt-3 border-t border-slate-200 text-xs">
                  <span className="font-semibold text-purple-800">Branching Logic Simulation:</span>
                  <div className="mt-1 bg-purple-50 p-2.5 rounded-lg border border-purple-200 space-y-1.5">
                    {previewQuestion.conditions.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>
                          Rule: Depends on <strong>{c.dependsOnQuestionCode}</strong> {c.operator} &apos;{c.value}&apos;
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = simulatedAnswers[c.dependsOnQuestionCode];
                            setSimulatedAnswers({
                              ...simulatedAnswers,
                              [c.dependsOnQuestionCode]: current === c.value ? "other" : c.value,
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-white border border-purple-300 text-purple-700 font-semibold"
                        >
                          Simulate Answer: {simulatedAnswers[c.dependsOnQuestionCode] || "(not answered)"}
                        </button>
                      </div>
                    ))}
                    <div className="pt-1 text-[11px] font-bold">
                      Evaluates to:{" "}
                      {previewQuestion.conditions.every((cond) => evaluateCondition(cond, simulatedAnswers)) ? (
                        <span className="text-emerald-700">✓ Displayed to field worker</span>
                      ) : (
                        <span className="text-slate-500">✗ Hidden (Condition not satisfied)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewQuestion(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {versionsModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Version Audit Trail: {versionsModalQuestion.code}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chronological audit of wording, options, and conditional changes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVersionsModalQuestion(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isLoadingVersions ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading version timeline...
                </div>
              ) : versionsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No historical versions recorded for this question.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-2">
                  {versionsList.map((ver) => (
                    <div key={ver.id || ver._id} className="relative space-y-1.5 text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Version {ver.versionNumber}
                          </span>
                          <Badge variant={STATUS_VARIANTS[ver.status] || "neutral"} size="sm">
                            {ver.status}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(ver.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-800">{ver.text?.en}</p>
                      {ver.text?.te && (
                        <p className="text-slate-500 font-serif text-[11px]">{ver.text.te}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span>Type: {ANSWER_TYPE_LABELS[ver.answerType] || ver.answerType}</span>
                        {ver.options?.length > 0 && <span>• {ver.options.length} options</span>}
                        {ver.createdBy && (
                          <span>• By {ver.createdBy.name || ver.createdBy.email || "Admin"}</span>
                        )}
                      </div>

                      {ver.changeNote && (
                        <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-600 italic">
                          &quot;{ver.changeNote}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setVersionsModalQuestion(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
