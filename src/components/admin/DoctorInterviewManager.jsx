"use client";

import { useState, useEffect, useCallback } from "react";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AddStakeholderModal from "@/components/common/AddStakeholderModal";
import {
  StethoscopeIcon,
  SearchIcon,
  PlusIcon,
  FilterIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UsersIcon,
  CalendarIcon,
  BuildingIcon,
  FolderIcon,
  CloseIcon,
  EditIcon,
  RefreshIcon,
  ClipboardIcon,
} from "@/components/common/Icons";

const STATUS_VARIANTS = {
  draft: "neutral",
  in_progress: "warning",
  completed: "success",
};

const STATUS_LABELS = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function DoctorInterviewManager({ userRole = "superadmin" }) {
  // State: Data
  const [interviews, setInterviews] = useState([]);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterFacilityId, setFilterFacilityId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Metadata
  const [projects, setProjects] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [surveyRounds, setSurveyRounds] = useState([]);
  const [doctorQuestions, setDoctorQuestions] = useState([]);

  // Modals
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [isLinkFamiliesOpen, setIsLinkFamiliesOpen] = useState(false);
  const [activeInterviewForLinks, setActiveInterviewForLinks] = useState(null);
  const [isExecuteOpen, setIsExecuteOpen] = useState(false);
  const [activeInterviewForExec, setActiveInterviewForExec] = useState(null);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);

  // Form State: Create/Edit
  const [formProjectId, setFormProjectId] = useState("");
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formMandalId, setFormMandalId] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formInterviewDate, setFormInterviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSurveyRoundId, setFormSurveyRoundId] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Linking Modal State
  const [candidateFamilies, setCandidateFamilies] = useState([]);
  const [familySearch, setFamilySearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [linkingFamilyId, setLinkingFamilyId] = useState(null);
  const [unlinkingFamilyId, setUnlinkingFamilyId] = useState(null);

  // Questionnaire Execution State
  const [answersMap, setAnswersMap] = useState({});
  const [execStatus, setExecStatus] = useState("completed");
  const [execNotes, setExecNotes] = useState("");
  const [savingExec, setSavingExec] = useState(false);
  const [execTab, setExecTab] = useState("families"); // "families" or "general"
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);
  const [familyAssessmentsMap, setFamilyAssessmentsMap] = useState({});
  const [showAddFamilyInExec, setShowAddFamilyInExec] = useState(false);
  const [candidateFamiliesInExec, setCandidateFamiliesInExec] = useState([]);
  const [loadingCandidatesInExec, setLoadingCandidatesInExec] = useState(false);
  const [execFamilySearch, setExecFamilySearch] = useState("");

  // 1. Fetch Metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const normalizeQuestions = (list) =>
        (list || []).map((q) => ({
          ...q,
          text: typeof q.text === "object" ? q.text?.en || q.text?.te || "" : q.text || "",
        }));

      if (userRole === "field_worker") {
        const metaRes = await fetch("/api/field/doctor-interviews/metadata");
        if (metaRes.ok) {
          const d = await metaRes.json();
          setProjects(d.projects || []);
          setFacilities(d.facilities || []);
          setMandals(d.mandals || []);
          setAllDoctors(d.doctors || []);
          setSurveyRounds(d.surveyRounds || []);
          setDoctorQuestions(normalizeQuestions(d.questions));
          return;
        }
      }

      const [projRes, facRes, manRes, docRes, rndRes, qRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/facilities?status=active&limit=200"),
        fetch("/api/admin/mandals?status=active&limit=100"),
        fetch("/api/admin/stakeholders?stakeholderType=doctor&status=active&limit=200"),
        fetch("/api/admin/survey-rounds?status=active&limit=50"),
        fetch("/api/admin/questions?category=doctor&status=active&limit=100"),
      ]);

      if (projRes.ok) {
        const d = await projRes.json();
        setProjects(d.items || d.data || []);
      }
      if (facRes.ok) {
        const d = await facRes.json();
        setFacilities(d.items || d.data || []);
      }
      if (manRes.ok) {
        const d = await manRes.json();
        setMandals(d.items || d.data || []);
      }
      if (docRes.ok) {
        const d = await docRes.json();
        setAllDoctors(d.items || d.data || []);
      }
      if (rndRes.ok) {
        const d = await rndRes.json();
        setSurveyRounds(d.items || d.data || []);
      }
      if (qRes.ok) {
        const d = await qRes.json();
        setDoctorQuestions(normalizeQuestions(d.items || d.data));
      }
    } catch (err) {
      console.error("Failed to load doctor interview metadata", err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // 2. Fetch Interviews List
  const fetchInterviews = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search.trim()) params.append("search", search.trim());
      if (filterProjectId) params.append("projectId", filterProjectId);
      if (filterFacilityId) params.append("facilityId", filterFacilityId);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(`/api/admin/doctor-interviews?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load doctor interviews");
      }

      setInterviews(data.items || []);
      setTotalInterviews(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterProjectId, filterFacilityId, filterStatus]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Handle direct navigation via URL query params (e.g. ?familyId=... from Family Workflow)
  useEffect(() => {
    if (typeof window !== "undefined" && interviews.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const queryFamilyId = params.get("familyId");
      if (queryFamilyId) {
        const targetInterview = interviews.find((inv) =>
          inv.linkedFamilyIds?.includes(queryFamilyId) ||
          inv.linkedFamilies?.some((f) => (f.id || f._id?.toString() || f.toString()) === queryFamilyId)
        );
        if (targetInterview) {
          openExecuteModal(targetInterview, queryFamilyId);
        } else if (interviews[0]) {
          openExecuteModal(interviews[0], queryFamilyId);
        }
      }
    }
  }, [interviews]);

  const getRef = (val) => val?._id?.toString() || val?.id?.toString() || val?.toString() || "";

  // Auto-select first project if creating and projects loaded
  useEffect(() => {
    if (!formProjectId && projects.length > 0 && isCreateEditOpen && !editingInterview) {
      setFormProjectId(projects[0].id || projects[0]._id);
    }
  }, [projects, formProjectId, isCreateEditOpen, editingInterview]);

  // Filtered dropdown lists for Form
  const formFilteredFacilities = facilities.filter((f) => {
    if (!formProjectId) return true;
    const pId = getRef(f.projectId) || getRef(f.project);
    return !pId || pId === formProjectId;
  });

  const formFilteredDoctors = allDoctors.filter((d) => {
    const docProjId = getRef(d.projectId) || getRef(d.project);
    if (formProjectId && docProjId && docProjId !== formProjectId) return false;
    const docFacId = getRef(d.facilityId) || getRef(d.facility);
    if (formFacilityId && docFacId && docFacId !== formFacilityId) return false;
    return true;
  });

  // Calculate stats
  const completedCount = interviews.filter((i) => i.status === "completed").length;
  const inProgressCount = interviews.filter((i) => i.status === "in_progress" || i.status === "draft").length;
  const totalLinkedFamiliesCount = interviews.reduce(
    (acc, curr) => acc + (curr.linkedFamilies?.length || 0),
    0
  );

  // Open Create Form
  const openCreateForm = () => {
    setEditingInterview(null);
    const initialProjectId = projects[0]?.id || projects[0]?._id || "";
    setFormProjectId(initialProjectId);
    setFormFacilityId("");
    setFormMandalId("");
    setFormDoctorId("");
    setFormInterviewDate(new Date().toISOString().split("T")[0]);
    setFormSurveyRoundId(surveyRounds[0]?.id || surveyRounds[0]?._id || "");
    setFormStatus("draft");
    setFormNotes("");
    setIsCreateEditOpen(true);
  };

  // Open Edit Form
  const openEditForm = (item) => {
    setEditingInterview(item);
    setFormProjectId(item.project?._id || item.project?.id || item.project || "");
    setFormFacilityId(item.facility?._id || item.facility?.id || item.facility || "");
    setFormMandalId(item.mandal?._id || item.mandal?.id || item.mandal || "");
    setFormDoctorId(item.doctor?._id || item.doctor?.id || item.doctor || "");
    setFormInterviewDate(
      item.interviewDate
        ? new Date(item.interviewDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormSurveyRoundId(item.surveyRound?._id || item.surveyRound?.id || item.surveyRound || "");
    setFormStatus(item.status || "draft");
    setFormNotes(item.notes || "");
    setIsCreateEditOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitInterview = async (e) => {
    e.preventDefault();
    if (!formProjectId || !formFacilityId || !formDoctorId) {
      setError("Please select Project, Facility, and Doctor.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        projectId: formProjectId,
        facilityId: formFacilityId,
        mandalId: formMandalId || undefined,
        doctorId: formDoctorId,
        interviewDate: formInterviewDate,
        surveyRoundId: formSurveyRoundId || undefined,
        status: formStatus,
        notes: formNotes,
      };

      let res;
      if (editingInterview) {
        res = await fetch(`/api/admin/doctor-interviews/${editingInterview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/doctor-interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save doctor interview");
      }

      setActionMessage(
        editingInterview
          ? `Interview ${editingInterview.interviewCode} updated successfully.`
          : `Doctor Interview ${data.item.interviewCode} created successfully.`
      );
      setIsCreateEditOpen(false);
      fetchInterviews();
    } catch (err) {
      setError(err.message || "Failed to submit interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Link Families Modal
  const openLinkFamiliesModal = async (interview) => {
    setActiveInterviewForLinks(interview);
    setIsLinkFamiliesOpen(true);
    setFamilySearch("");
    setCandidateFamilies([]);

    // Load candidate families in the same project & facility catchment
    setLoadingCandidates(true);
    try {
      const projId = interview.project?._id || interview.project?.id || interview.project;
      const facId = interview.facility?._id || interview.facility?.id || interview.facility;
      const url =
        userRole === "field_worker"
          ? `/api/field/doctor-interviews/candidate-families?projectId=${projId}&facilityId=${facId}`
          : `/api/admin/families?projectId=${projId}&facilityId=${facId}&status=active&limit=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCandidateFamilies(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load candidate families", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Perform Link Family
  const handleLinkFamily = async (familyId) => {
    if (!activeInterviewForLinks) return;
    setLinkingFamilyId(familyId);
    setError("");

    try {
      const res = await fetch(`/api/admin/doctor-interviews/${activeInterviewForLinks.id}/link-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to link family");
      }

      setActionMessage(`Family linked to interview ${activeInterviewForLinks.interviewCode}.`);
      setActiveInterviewForLinks(data.item);
      fetchInterviews();
    } catch (err) {
      setError(err.message || "Failed to link family");
    } finally {
      setLinkingFamilyId(null);
    }
  };

  // Perform Unlink Family
  const handleUnlinkFamily = async (familyId) => {
    if (!activeInterviewForLinks) return;
    setUnlinkingFamilyId(familyId);
    setError("");

    try {
      const res = await fetch(`/api/admin/doctor-interviews/${activeInterviewForLinks.id}/link-family`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to unlink family");
      }

      setActionMessage("Family unlinked safely. (Family and Interview records remain intact)");
      setActiveInterviewForLinks(data.item);
      fetchInterviews();
    } catch (err) {
      setError(err.message || "Failed to unlink family");
    } finally {
      setUnlinkingFamilyId(null);
    }
  };

  // Open Execute Questionnaire Modal
  const openExecuteModal = (interview, targetFamilyId = null) => {
    setActiveInterviewForExec(interview);
    setExecStatus(interview.status || "completed");
    setExecNotes(interview.completionNotes || "");

    // Populate existing general answers
    const map = {};
    if (interview.answers && Array.isArray(interview.answers)) {
      interview.answers.forEach((ans) => {
        const qId = ans.questionId?._id || ans.questionId?.id || ans.questionId;
        if (qId) map[qId] = ans.value;
      });
    }
    setAnswersMap(map);

    // Populate family assessments
    const famMap = {};
    if (interview.familyAssessments && Array.isArray(interview.familyAssessments)) {
      interview.familyAssessments.forEach((fa) => {
        const fId = fa.familyId || fa.family?._id || fa.family;
        if (fId) {
          famMap[fId.toString()] = {
            healthStatus: fa.healthStatus || "",
            treatmentAdherence: fa.treatmentAdherence || "",
            droneMedicineReceived: fa.droneMedicineReceived || "",
            clinicalObservations: fa.clinicalObservations || "",
            recommendations: fa.recommendations || "",
            notes: fa.notes || "",
          };
        }
      });
    }
    setFamilyAssessmentsMap(famMap);

    // Select initial active family
    const families = interview.linkedFamilies || [];
    if (families.length > 0) {
      setExecTab("families");
      if (targetFamilyId) {
        const idx = families.findIndex(
          (f) => (f.id || f._id?.toString() || f.toString()) === targetFamilyId
        );
        setActiveFamilyIndex(idx >= 0 ? idx : 0);
      } else {
        setActiveFamilyIndex(0);
      }
    } else {
      setExecTab("families");
      setActiveFamilyIndex(0);
    }

    setShowAddFamilyInExec(false);
    loadCandidatesForExec(interview);
    setIsExecuteOpen(true);
  };

  // Load candidate families for linking inside execution modal
  const loadCandidatesForExec = async (interview) => {
    setLoadingCandidatesInExec(true);
    try {
      const projId = interview.project?._id || interview.project?.id || interview.project;
      const facId = interview.facility?._id || interview.facility?.id || interview.facility;
      const url =
        userRole === "field_worker"
          ? `/api/field/doctor-interviews/candidate-families?projectId=${projId}&facilityId=${facId}`
          : `/api/admin/families?projectId=${projId}&facilityId=${facId}&status=active&limit=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCandidateFamiliesInExec(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load candidate families for exec", err);
    } finally {
      setLoadingCandidatesInExec(false);
    }
  };

  // Link a family from inside the execution modal
  const handleLinkFamilyInExec = async (familyId) => {
    if (!activeInterviewForExec) return;
    setLinkingFamilyId(familyId);
    try {
      const res = await fetch(`/api/admin/doctor-interviews/${activeInterviewForExec.id}/link-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveInterviewForExec(data.item);
        const newFamList = data.item.linkedFamilies || [];
        const newIdx = newFamList.findIndex(
          (f) => (f.id || f._id?.toString() || f.toString()) === familyId
        );
        if (newIdx >= 0) {
          setActiveFamilyIndex(newIdx);
          setExecTab("families");
        }
        setShowAddFamilyInExec(false);
        setActionMessage(`Linked family to doctor interview. You can now ask questions about this family.`);
        fetchInterviews();
      }
    } catch (err) {
      console.error("Link family error:", err);
    } finally {
      setLinkingFamilyId(null);
    }
  };

  // Unified Save: saves current family assessment and general doctor answers
  const handleSaveFamilyAssessment = async ({ advance = false, finalize = false } = {}) => {
    if (!activeInterviewForExec) return;
    const families = activeInterviewForExec.linkedFamilies || [];
    const currentFamily = families[activeFamilyIndex];

    const answersPayload = Object.entries(answersMap).map(([questionId, value]) => {
      const qObj = doctorQuestions.find((q) => q.id === questionId);
      return {
        questionId,
        questionCode: qObj?.code || "",
        questionText: typeof qObj?.text === "object" ? qObj?.text?.en || qObj?.text?.te || "" : qObj?.text || "",
        category: "doctor",
        value,
        answeredAt: new Date().toISOString(),
      };
    });

    const updatedAssessments = Object.entries(familyAssessmentsMap).map(([fId, data]) => ({
      familyId: fId,
      healthStatus: data.healthStatus || "",
      treatmentAdherence: data.treatmentAdherence || "",
      droneMedicineReceived: data.droneMedicineReceived || "",
      clinicalObservations: data.clinicalObservations || "",
      recommendations: data.recommendations || "",
      notes: data.notes || "",
      updatedAt: new Date().toISOString(),
    }));

    if (currentFamily) {
      const currentFamId = currentFamily.id || currentFamily._id?.toString() || currentFamily.toString();
      const currentData = familyAssessmentsMap[currentFamId] || {};
      const existsIndex = updatedAssessments.findIndex((a) => a.familyId === currentFamId);
      const currentItem = {
        familyId: currentFamId,
        healthStatus: currentData.healthStatus || "",
        treatmentAdherence: currentData.treatmentAdherence || "",
        droneMedicineReceived: currentData.droneMedicineReceived || "",
        clinicalObservations: currentData.clinicalObservations || "",
        recommendations: currentData.recommendations || "",
        notes: currentData.notes || "",
        updatedAt: new Date().toISOString(),
      };
      if (existsIndex >= 0) {
        updatedAssessments[existsIndex] = currentItem;
      } else {
        updatedAssessments.push(currentItem);
      }
    }

    try {
      setSavingExec(true);
      setError("");

      const finalStatus = finalize
        ? (execStatus || "completed")
        : (execStatus === "completed" ? "completed" : "in_progress");

      const res = await fetch(`/api/admin/doctor-interviews/${activeInterviewForExec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersPayload,
          familyAssessments: updatedAssessments,
          status: finalStatus,
          completionNotes: execNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save responses");
      }

      setActiveInterviewForExec(data.item);

      if (finalize) {
        setActionMessage(`Doctor Interview ${activeInterviewForExec.interviewCode} completed & finalized successfully.`);
        setIsExecuteOpen(false);
      } else if (advance && activeFamilyIndex < families.length - 1) {
        setActionMessage(
          currentFamily
            ? `✓ Saved for ${currentFamily.householdHeadName} (${currentFamily.familyCode}). Next: Family ${activeFamilyIndex + 2} of ${families.length}.`
            : "✓ Saved responses."
        );
        setActiveFamilyIndex((prev) => prev + 1);
      } else {
        setActionMessage(`✓ Saved responses successfully.`);
      }
      fetchInterviews();
    } catch (err) {
      setError(err.message || "Failed to save responses");
    } finally {
      setSavingExec(false);
    }
  };

  const handleSaveAndNextFamily = () => handleSaveFamilyAssessment({ advance: true });
  const handleSaveExecution = (e) => {
    if (e) e.preventDefault();
    handleSaveFamilyAssessment({ finalize: true });
  };


  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
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
          <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-rose-600 hover:text-rose-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Interviews</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <StethoscopeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalInterviews}</div>
          <div className="mt-1 text-[11px] text-slate-400">Independent doctor clinical records</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{completedCount}</div>
          <div className="mt-1 text-[11px] text-slate-400">Finalized questionnaires</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Draft / In Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ClipboardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{inProgressCount}</div>
          <div className="mt-1 text-[11px] text-slate-400">Pending responses or verification</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Linked Families</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">{totalLinkedFamiliesCount}</div>
          <div className="mt-1 text-[11px] text-slate-400">Family/patient associations</div>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by code (DOC-...), doctor name, or notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[44px] sm:min-h-[40px]"
              />
            </div>
            <Button
              onClick={openCreateForm}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              <span>New Doctor Interview</span>
            </Button>
          </div>

          {/* Secondary Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-slate-100">
            <select
              value={filterProjectId}
              onChange={(e) => {
                setFilterProjectId(e.target.value);
                setFilterFacilityId("");
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none min-h-[40px]"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterFacilityId}
              onChange={(e) => {
                setFilterFacilityId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none min-h-[40px]"
            >
              <option value="">All Catchment Facilities</option>
              {facilities
                .filter((f) => !filterProjectId || (f.project?._id || f.project?.id || f.project) === filterProjectId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.serviceCategory || "PHC"})
                  </option>
                ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none min-h-[40px]"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
          <RefreshIcon className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading doctor interviews...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <StethoscopeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Doctor Interviews Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {search || filterProjectId || filterFacilityId || filterStatus
              ? "No interviews match your filter criteria. Try adjusting your filters."
              : "No doctor interviews recorded yet. Create an interview to capture clinical observations and link patients."}
          </p>
          <Button
            onClick={openCreateForm}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
          >
            <PlusIcon className="w-4 h-4 mr-1.5" />
            <span>Create First Doctor Interview</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards (sm:hidden) */}
          <div className="space-y-3 sm:hidden">
            {interviews.map((iv) => {
              const linkedCount = iv.linkedFamilies?.length || 0;
              return (
                <div key={iv.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {iv.interviewCode}
                    </span>
                    <Badge variant={STATUS_VARIANTS[iv.status] || "neutral"} size="sm">
                      {STATUS_LABELS[iv.status] || iv.status}
                    </Badge>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      Dr. {iv.doctor?.fullName || "Doctor"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {iv.doctor?.designation || "Medical Officer"} • {iv.facility?.name || "Facility N/A"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Project</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {iv.project?.name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Interview Date</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {iv.interviewDate ? new Date(iv.interviewDate).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openLinkFamiliesModal(iv)}
                      className="inline-flex items-center gap-1.5 text-indigo-700 font-semibold hover:underline"
                    >
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span>{linkedCount} Linked {linkedCount === 1 ? "Family" : "Families"}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openExecuteModal(iv)}
                        className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-bold text-xs"
                      >
                        Execute
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(iv)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Doctor / Medical Officer</th>
                    <th className="px-5 py-3.5">Project & Facility</th>
                    <th className="px-5 py-3.5">Date & Interviewer</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Linked Families</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interviews.map((iv) => {
                    const linkedCount = iv.linkedFamilies?.length || 0;
                    return (
                      <tr key={iv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {iv.interviewCode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">
                            Dr. {iv.doctor?.fullName || "Doctor"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {iv.doctor?.designation || "Medical Officer"}
                            {iv.doctor?.phone ? ` • ${iv.doctor.phone}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">
                            {iv.facility?.name || "Facility N/A"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {iv.project?.name || "Project N/A"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">
                            {iv.interviewDate ? new Date(iv.interviewDate).toLocaleDateString() : "N/A"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            By: {iv.interviewer?.fullName || "Field Staff"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={STATUS_VARIANTS[iv.status] || "neutral"} size="sm">
                            {STATUS_LABELS[iv.status] || iv.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => openLinkFamiliesModal(iv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-[11px] hover:bg-indigo-100 transition-colors"
                          >
                            <UsersIcon className="w-3 h-3 text-indigo-600" />
                            <span>{linkedCount} Linked</span>
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openExecuteModal(iv)}
                            className="text-blue-700 hover:text-blue-900 font-bold text-xs"
                          >
                            Execute
                          </button>
                          <button
                            type="button"
                            onClick={() => openLinkFamiliesModal(iv)}
                            className="text-indigo-700 hover:text-indigo-900 font-medium text-xs"
                          >
                            Links
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(iv)}
                            className="text-slate-600 hover:text-slate-900 font-medium text-xs"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50/40 text-xs">
                <span className="text-slate-500">
                  Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span> ({totalInterviews} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Doctor Interview */}
      {isCreateEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 flex min-h-full items-center justify-center animate-fadeIn">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <StethoscopeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingInterview ? `Edit Interview: ${editingInterview.interviewCode}` : "New Doctor Interview"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create an independent clinical interview session
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInterview} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Project */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Project *
                  </label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      setFormFacilityId("");
                      setFormDoctorId("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                  >
                    <option value="" disabled>Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Facility */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Catchment Facility *
                  </label>
                  <select
                    required
                    value={formFacilityId}
                    onChange={(e) => {
                      const selectedFacId = e.target.value;
                      setFormFacilityId(selectedFacId);
                      setFormDoctorId("");
                      const matched = facilities.find((f) => (f.id || f._id) === selectedFacId);
                      if (matched) {
                        const mId = getRef(matched.mandalId) || getRef(matched.mandal);
                        if (mId) setFormMandalId(mId);
                      }
                    }}
                    disabled={!formProjectId && projects.length > 0}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 min-h-[38px]"
                  >
                    <option value="" disabled>Select Healthcare Facility</option>
                    {formFilteredFacilities.map((f) => (
                      <option key={f.id || f._id} value={f.id || f._id}>{f.name} ({f.facilityType || f.serviceCategory || "PHC"})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor Selector + Add Doctor inline button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    3. Doctor / Medical Officer *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddDoctorModalOpen(true)}
                    disabled={!formProjectId && projects.length > 0}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Add New Doctor</span>
                  </button>
                </div>
                <select
                  required
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  disabled={!formProjectId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 min-h-[38px]"
                >
                  <option value="" disabled>
                    {formFilteredDoctors.length === 0 ? "No doctors found in project" : "Select Doctor"}
                  </option>
                  {formFilteredDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.fullName} {d.designation ? `(${d.designation})` : ""} {d.phone ? `- ${d.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Interview Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Interview Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formInterviewDate}
                    onChange={(e) => setFormInterviewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    5. Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Optional Survey Round */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6. Applicable Survey Round (Optional)
                </label>
                <select
                  value={formSurveyRoundId}
                  onChange={(e) => setFormSurveyRoundId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                >
                  <option value="">None / Independent (Round-Agnostic)</option>
                  {surveyRounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.roundType})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Doctor interviews are stored independently and can remain round-agnostic unless tied to a specific evaluation phase.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  7. Clinical Notes / Interview Objective
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Clinical assessment on maternal & infant care delivery, drone drug delivery reliability, stockout frequency..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateEditOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {editingInterview ? "Update Interview" : "Create Interview"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manage Linked Families */}
      {isLinkFamiliesOpen && activeInterviewForLinks && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 flex min-h-full items-center justify-center animate-fadeIn">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Linked Families for {activeInterviewForLinks.interviewCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dr. {activeInterviewForLinks.doctor?.fullName || "Doctor"} • {activeInterviewForLinks.facility?.name || "Facility"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkFamiliesOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* CURRENTLY LINKED FAMILIES */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Currently Linked Families ({activeInterviewForLinks.linkedFamilies?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Unlinking removes the link safely without deleting family or interview records
                  </span>
                </div>

                {!activeInterviewForLinks.linkedFamilies || activeInterviewForLinks.linkedFamilies.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No families currently linked to this doctor interview. Use the search below to link relevant families.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeInterviewForLinks.linkedFamilies.map((fam) => {
                      const famId = fam._id || fam.id || fam;
                      const famCode = fam.familyCode || "FAM-...";
                      const headName = fam.householdHeadName || "Household Head";
                      const villageName = fam.village?.name || "";
                      const phone = fam.phoneNumber || "";

                      return (
                        <div
                          key={famId}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{famCode}</span>
                              <span className="font-semibold text-slate-900">{headName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {villageName ? `Village: ${villageName}` : ""}
                              {phone ? ` • Phone: ${phone}` : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkFamily(famId)}
                            disabled={unlinkingFamilyId === famId}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
                          >
                            {unlinkingFamilyId === famId ? "Unlinking..." : "Unlink"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SEARCH & LINK NEW FAMILIES */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Search & Link Candidate Families
                </div>
                <p className="text-[11px] text-slate-500">
                  Showing eligible families in catchment: <strong>{activeInterviewForLinks.facility?.name}</strong>
                </p>

                <div className="relative">
                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    placeholder="Search candidate families by code, household head, or village..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none min-h-[38px]"
                  />
                </div>

                {loadingCandidates ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Loading candidate families...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {candidateFamilies
                      .filter((f) => {
                        const searchLower = familySearch.toLowerCase();
                        const matchesSearch =
                          !familySearch ||
                          f.familyCode?.toLowerCase().includes(searchLower) ||
                          f.householdHeadName?.toLowerCase().includes(searchLower) ||
                          f.village?.name?.toLowerCase().includes(searchLower);

                        const alreadyLinked = activeInterviewForLinks.linkedFamilies?.some(
                          (lf) => (lf._id || lf.id || lf) === f.id
                        );
                        return matchesSearch && !alreadyLinked;
                      })
                      .map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white text-xs transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700">{f.familyCode}</span>
                              <span className="font-medium text-slate-800">{f.householdHeadName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Village: {f.village?.name || "N/A"} • Phone: {f.phoneNumber || "None"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkFamily(f.id)}
                            disabled={linkingFamilyId === f.id}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shrink-0 transition-colors disabled:opacity-50"
                          >
                            {linkingFamilyId === f.id ? "Linking..." : "+ Link"}
                          </button>
                        </div>
                      ))}
                    {candidateFamilies.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No candidate families found in this facility catchment.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/90 px-5 py-3 flex justify-end shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsLinkFamiliesOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Questionnaire / Clinical Execution with Family-by-Family Switcher */}
      {isExecuteOpen && activeInterviewForExec && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 flex min-h-full items-center justify-center animate-fadeIn">
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <StethoscopeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Doctor Clinical Interview:</span>
                    <span className="font-mono text-blue-600">{activeInterviewForExec.interviewCode}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dr. {activeInterviewForExec.doctor?.fullName} • {activeInterviewForExec.facility?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExecuteOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* UNIFIED EXECUTION FORM (Family-by-family clinical review + General Doctor questions joined below) */}
            <form onSubmit={handleSaveExecution} className="p-5 space-y-5 overflow-y-auto flex-1 max-h-[80vh]">
              {/* SECTION A: Patient Family Reviews */}
              {activeInterviewForExec.linkedFamilies?.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">No Patient Families Linked Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Link patient households from this facility catchment to record family-specific diagnoses, treatments, and drone deliveries.
                    </p>
                  </div>
                  <div className="pt-1">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsExecuteOpen(false);
                        openLinkFamiliesModal(activeInterviewForExec);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      <PlusIcon className="w-4 h-4 mr-1.5" />
                      <span>Link Families Now</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Family Selector / Switcher Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Patient Family Reviews ({activeFamilyIndex + 1} of {activeInterviewForExec.linkedFamilies.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddFamilyInExec(!showAddFamilyInExec)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>{showAddFamilyInExec ? "Hide Add Family" : "+ Link Another Family"}</span>
                      </button>
                    </div>

                    {/* Quick Inline Family Search & Linker */}
                    {showAddFamilyInExec && (
                      <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900">
                            Link Additional Family from {activeInterviewForExec.facility?.name}
                          </span>
                          <span className="text-[11px] text-indigo-600">
                            {candidateFamiliesInExec.length} candidate families
                          </span>
                        </div>
                        <input
                          type="text"
                          value={execFamilySearch}
                          onChange={(e) => setExecFamilySearch(e.target.value)}
                          placeholder="Type family code (FAM-...) or household head name..."
                          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="max-h-36 overflow-y-auto space-y-1 pt-1 divide-y divide-indigo-100">
                          {candidateFamiliesInExec
                            .filter((f) => {
                              const isAlreadyLinked = activeInterviewForExec.linkedFamilies.some(
                                (lf) => (lf.id || lf._id?.toString() || lf.toString()) === f.id
                              );
                              if (isAlreadyLinked) return false;
                              if (!execFamilySearch) return true;
                              const q = execFamilySearch.toLowerCase();
                              return (
                                f.familyCode?.toLowerCase().includes(q) ||
                                f.householdHeadName?.toLowerCase().includes(q) ||
                                f.village?.name?.toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 10)
                            .map((f) => (
                              <div key={f.id} className="flex items-center justify-between py-1.5 text-xs">
                                <div>
                                  <span className="font-bold text-slate-900">{f.familyCode}</span>
                                  <span className="text-slate-600 ml-2">{f.householdHeadName}</span>
                                  <span className="text-slate-400 text-[11px] ml-2">({f.village?.name || "Village"})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleLinkFamilyInExec(f.id)}
                                  disabled={linkingFamilyId === f.id}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] disabled:opacity-50"
                                >
                                  {linkingFamilyId === f.id ? "Linking..." : "+ Add"}
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Family Horizontal Pills Carousel */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {activeInterviewForExec.linkedFamilies.map((fam, idx) => {
                        const fId = fam.id || fam._id?.toString() || fam.toString();
                        const isCurrent = idx === activeFamilyIndex;
                        const hasData =
                          familyAssessmentsMap[fId]?.healthStatus ||
                          familyAssessmentsMap[fId]?.treatmentAdherence;

                        return (
                          <button
                            key={fId}
                            type="button"
                            onClick={() => setActiveFamilyIndex(idx)}
                            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                              isCurrent
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : hasData
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isCurrent
                                  ? "bg-white text-blue-600"
                                  : hasData
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {hasData && !isCurrent ? "✓" : idx + 1}
                            </span>
                            <div className="text-left">
                              <div className="font-bold">{fam.familyCode || `Family ${idx + 1}`}</div>
                              <div
                                className={`text-[10px] truncate max-w-[120px] ${
                                  isCurrent ? "text-blue-100" : "text-slate-500"
                                }`}
                              >
                                {fam.householdHeadName}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Selected Family Profile & The 4 Clinical Questions */}
                  {(() => {
                    const currentFam = activeInterviewForExec.linkedFamilies[activeFamilyIndex];
                    if (!currentFam) return null;
                    const fId = currentFam.id || currentFam._id?.toString() || currentFam.toString();
                    const currentData = familyAssessmentsMap[fId] || {};

                    const updateCurrentField = (field, val) => {
                      setFamilyAssessmentsMap((prev) => ({
                        ...prev,
                        [fId]: {
                          ...prev[fId],
                          [field]: val,
                        },
                      }));
                    };

                    return (
                      <div className="space-y-4 pt-1">
                        {/* Family Banner */}
                        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>Patient Household: {currentFam.householdHeadName}</span>
                              <Badge variant="primary" size="sm">
                                {currentFam.familyCode}
                              </Badge>
                            </div>
                            <div className="text-slate-600 mt-0.5 flex items-center gap-3">
                              <span>
                                Village: <strong>{currentFam.village?.name || currentFam.village || "N/A"}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Phone: <strong>{currentFam.phoneNumber || "None"}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                            Interviewing Doctor for Family {activeFamilyIndex + 1} of {activeInterviewForExec.linkedFamilies.length}
                          </div>
                        </div>

                        {/* 1. Patient Diagnosis & Observed Health Conditions */}
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                          <label className="block text-xs font-bold text-slate-800">
                            1. Patient Diagnosis & Observed Health Conditions
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Ask the doctor: What medical conditions, symptoms, or chronic illnesses were observed for members of this household?
                          </p>
                          <textarea
                            rows={2}
                            value={currentData.healthStatus || ""}
                            onChange={(e) => updateCurrentField("healthStatus", e.target.value)}
                            placeholder="e.g. Hypertension diagnosed, maternal checkup completed, child fever under control..."
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* 2. Prescribed Treatment & Medication Adherence */}
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                          <label className="block text-xs font-bold text-slate-800">
                            2. Prescribed Treatment & Medication Adherence
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Ask the doctor: What medicines are prescribed to this patient, and are they adhering to the treatment protocol?
                          </p>
                          <textarea
                            rows={2}
                            value={currentData.treatmentAdherence || ""}
                            onChange={(e) => updateCurrentField("treatmentAdherence", e.target.value)}
                            placeholder="e.g. Prescribed Amlodipine 5mg daily. Patient adhering regularly, no adverse reactions..."
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* 3. Drone Medicine Delivery Verification for this Family */}
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                          <label className="block text-xs font-bold text-slate-800">
                            3. Drone Medicine Delivery Verification for this Family
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Were emergency medicines or diagnostic tests dispatched via drone for this household?
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={currentData.droneMedicineReceived || ""}
                              onChange={(e) => updateCurrentField("droneMedicineReceived", e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">Select drone delivery status...</option>
                              <option value="delivered_on_time">Yes - Delivered On-Time via Drone</option>
                              <option value="delivered_delayed">Yes - Delivered but Delayed</option>
                              <option value="not_required">Not Required for this Patient</option>
                              <option value="stock_unavailable">Stock Unavailable at Hub</option>
                            </select>
                            <input
                              type="text"
                              value={currentData.notes || ""}
                              onChange={(e) => updateCurrentField("notes", e.target.value)}
                              placeholder="Package condition / remarks..."
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* 4. Doctor's Clinical Recommendations & Referrals */}
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                          <label className="block text-xs font-bold text-slate-800">
                            4. Doctor&apos;s Clinical Recommendations & Referrals
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Follow-up screening date, dietary changes, or referral to District Hospital / Specialist:
                          </p>
                          <textarea
                            rows={2}
                            value={currentData.recommendations || ""}
                            onChange={(e) => updateCurrentField("recommendations", e.target.value)}
                            placeholder="e.g. Schedule follow-up blood pressure check in 2 weeks. Maintain low salt diet..."
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SECTION B: General Facility & Doctor Questions (JOINED DIRECTLY BELOW QUESTION 4) */}
              <div className="pt-4 border-t-2 border-slate-200 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <ClipboardIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      General Facility & Doctor Questions {doctorQuestions.length > 0 ? `(${doctorQuestions.length})` : ""}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      PHC facility clinical observations, drone delivery logistics & medicine stock feedback
                    </p>
                  </div>
                </div>

                {doctorQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {doctorQuestions.map((q, idx) => (
                      <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <label className="text-xs font-bold text-slate-800">
                            {idx + 1}. {typeof q.text === "object" ? q.text?.en || q.text?.te || "" : q.text || ""}
                          </label>
                          <span className="font-mono text-[10px] text-slate-400">{q.code}</span>
                        </div>
                        {q.answerType === "boolean" ? (
                          <div className="flex items-center gap-4 text-xs pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={answersMap[q.id] === "yes" || answersMap[q.id] === true}
                                onChange={() => setAnswersMap((prev) => ({ ...prev, [q.id]: "yes" }))}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium text-slate-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={answersMap[q.id] === "no" || answersMap[q.id] === false}
                                onChange={() => setAnswersMap((prev) => ({ ...prev, [q.id]: "no" }))}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium text-slate-700">No</span>
                            </label>
                          </div>
                        ) : q.answerType === "single_choice" && q.options?.length > 0 ? (
                          <select
                            value={answersMap[q.id] || ""}
                            onChange={(e) => setAnswersMap((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Select option...</option>
                            {q.options.map((opt) => (
                              <option key={opt.value || opt.label} value={opt.value || opt.label}>
                                {opt.label || opt.value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <textarea
                            rows={2}
                            value={answersMap[q.id] || ""}
                            onChange={(e) => setAnswersMap((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Doctor's response..."
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                      <label className="block text-xs font-bold text-slate-800">
                        1. Overall Village & Catchment Health Trends
                      </label>
                      <textarea
                        rows={2}
                        value={answersMap["clinical_observations"] || ""}
                        onChange={(e) => setAnswersMap((prev) => ({ ...prev, clinical_observations: e.target.value }))}
                        placeholder="e.g. Increase in seasonal viral fevers, high maternal checkup attendance..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                      <label className="block text-xs font-bold text-slate-800">
                        2. Medicine Availability & Drone Delivery Feedback
                      </label>
                      <textarea
                        rows={2}
                        value={answersMap["drone_delivery_feedback"] || ""}
                        onChange={(e) => setAnswersMap((prev) => ({ ...prev, drone_delivery_feedback: e.target.value }))}
                        placeholder="e.g. Critical anti-snake venom delivered via drone in 18 minutes..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-xs">
                      <label className="block text-xs font-bold text-slate-800">
                        3. Facility Recommendations
                      </label>
                      <textarea
                        rows={2}
                        value={answersMap["followup_advice"] || ""}
                        onChange={(e) => setAnswersMap((prev) => ({ ...prev, followup_advice: e.target.value }))}
                        placeholder="e.g. Organize weekend diagnostic screening camp..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Overall Interview Session Status & Notes */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Session Completion Status & Final Notes
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Session Status *
                      </label>
                      <select
                        value={execStatus}
                        onChange={(e) => setExecStatus(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                      >
                        <option value="draft">Draft (Incomplete)</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed & Finalized</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Verification Notes
                      </label>
                      <input
                        type="text"
                        value={execNotes}
                        onChange={(e) => setExecNotes(e.target.value)}
                        placeholder="e.g. Verified in person at PHC"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: Family Navigation & Final Submission Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => activeFamilyIndex > 0 && setActiveFamilyIndex(activeFamilyIndex - 1)}
                    disabled={activeFamilyIndex === 0}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 inline-flex items-center gap-1 transition-colors border border-slate-200 rounded-xl bg-white"
                  >
                    ← Previous Family
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveFamilyAssessment()}
                    isLoading={savingExec}
                    className="text-xs"
                  >
                    Save Progress
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExecuteOpen(false)}
                    disabled={savingExec}
                    className="text-xs"
                  >
                    Close
                  </Button>

                  {activeInterviewForExec.linkedFamilies?.length > 1 &&
                  activeFamilyIndex < activeInterviewForExec.linkedFamilies.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => handleSaveFamilyAssessment({ advance: true })}
                      isLoading={savingExec}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2"
                    >
                      <span>
                        Save & Next Family (Family {activeFamilyIndex + 2} of{" "}
                        {activeInterviewForExec.linkedFamilies.length}) →
                      </span>
                    </Button>
                  ) : null}

                  <Button
                    type="submit"
                    isLoading={savingExec}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                    <span>Save & Finalize Interview ✓</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 4: Inline Add Doctor Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={isAddDoctorModalOpen}
        onClose={() => setIsAddDoctorModalOpen(false)}
        projects={projects}
        mandals={mandals}
        facilities={facilities}
        defaultValues={{
          projectId: formProjectId,
          mandalId: formMandalId || (() => {
            const fac = facilities.find((f) => (f.id || f._id) === formFacilityId);
            return fac ? (getRef(fac.mandalId) || getRef(fac.mandal)) : "";
          })(),
          facilityId: formFacilityId,
          stakeholderType: "doctor",
          designation: "Medical Officer",
        }}
        lockGeography={false}
        onStakeholderCreated={(newDoc) => {
          setAllDoctors((prev) => {
            const exists = prev.some((d) => (d.id || d._id) === (newDoc.id || newDoc._id));
            if (exists) return prev;
            return [...prev, newDoc];
          });
          setFormDoctorId(newDoc.id || newDoc._id);
          const newDocFacId = getRef(newDoc.facilityId) || getRef(newDoc.facility);
          const newDocManId = getRef(newDoc.mandalId) || getRef(newDoc.mandal);
          if (newDocFacId && !formFacilityId) {
            setFormFacilityId(newDocFacId);
          }
          if (newDocManId && !formMandalId) {
            setFormMandalId(newDocManId);
          }
          setActionMessage(`Doctor "${newDoc.fullName}" created and selected.`);
        }}
      />
    </div>
  );
}
