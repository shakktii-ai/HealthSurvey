"use client";

import { useState, useEffect, useId, useCallback } from "react";
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
  PlusIcon,
  SearchIcon,
  CheckCircleIcon,
  CloseIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CalendarIcon,
  ActivityIcon,
  FolderIcon,
} from "@/components/common/Icons";

const STATUS_BADGES = {
  assigned: { variant: "neutral", label: "Assigned" },
  in_progress: { variant: "warning", label: "In Progress" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const CATEGORY_LABELS = {
  family: "Household Survey",
  asha: "ASHA Interview",
  facility_staff: "Facility Staff Interview",
  light_touch: "Light-Touch Verification",
  govt_official: "Government Official Interview",
};

export default function AssignmentManager() {
  // Filters & Pagination
  const [projectFilter, setProjectFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data
  const [assignments, setAssignments] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Metadata dropdowns
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [villages, setVillages] = useState([]);
  const [families, setFamilies] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Selected for action
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Single Family Form state
  const [formProject, setFormProject] = useState("");
  const [formRound, setFormRound] = useState("");
  const [formWorker, setFormWorker] = useState("");
  const [formFamilyMandal, setFormFamilyMandal] = useState("");
  const [formFamilyVillage, setFormFamilyVillage] = useState("");
  const [formFamilyId, setFormFamilyId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Village Batch Form state
  const [batchProject, setBatchProject] = useState("");
  const [batchRound, setBatchRound] = useState("");
  const [batchMandal, setBatchMandal] = useState("");
  const [batchVillage, setBatchVillage] = useState("");
  const [batchWorker, setBatchWorker] = useState("");
  const [batchDueDate, setBatchDueDate] = useState("");
  const [batchStep, setBatchStep] = useState(1); // 1: Select, 2: Preview, 3: Results
  const [batchPreview, setBatchPreview] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");

  // Stakeholder Task Form state
  const [stkProject, setStkProject] = useState("");
  const [stkRound, setStkRound] = useState("");
  const [stkCategory, setStkCategory] = useState("asha");
  const [stkStakeholderId, setStkStakeholderId] = useState("");
  const [stkWorker, setStkWorker] = useState("");
  const [stkDueDate, setStkDueDate] = useState("");
  const [stkError, setStkError] = useState("");
  const [stkSubmitting, setStkSubmitting] = useState(false);

  // Reassign Form state
  const [reassignWorkerId, setReassignWorkerId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError, setReassignError] = useState("");

  // Cancel Form state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const searchId = useId();

  // Load Metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [projRes, rRes, uRes] = await Promise.all([
          fetch("/api/admin/projects"),
          fetch("/api/admin/survey-rounds"),
          fetch("/api/admin/users?role=field_worker"),
        ]);
        const projData = await projRes.json();
        const rData = await rRes.json();
        const uData = await uRes.json();

        if (projData.success) {
          setProjects(projData.items || projData.projects || []);
        }
        if (rData.success) {
          setRounds(rData.items || []);
        }
        if (uData.success) {
          setWorkers((uData.users || []).filter((u) => u.status === "active"));
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (projectFilter) params.append("projectId", projectFilter);
      if (roundFilter) params.append("surveyRoundId", roundFilter);
      if (workerFilter) params.append("fieldWorkerId", workerFilter);
      if (typeFilter) params.append("assignmentType", typeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/assignments?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load assignments");
      }

      setAssignments(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, roundFilter, workerFilter, typeFilter, statusFilter, search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssignments();
  }, [fetchAssignments]);

  // Load Mandals & Villages when a project is selected in forms
  const loadProjectGeos = async (projId) => {
    if (!projId) {
      setMandals([]);
      setVillages([]);
      return;
    }
    try {
      const [mRes, vRes] = await Promise.all([
        fetch(`/api/admin/mandals?projectId=${projId}`),
        fetch(`/api/admin/villages?projectId=${projId}`),
      ]);
      const mData = await mRes.json();
      const vData = await vRes.json();
      if (mData.success) setMandals(mData.items || mData.mandals || []);
      if (vData.success) setVillages(vData.items || vData.villages || []);
    } catch (e) {
      console.error("Failed to load project geos:", e);
    }
  };

  // Load Families for Single Assignment Form
  const loadProjectFamilies = async (projId, villageId = "") => {
    if (!projId) {
      setFamilies([]);
      return;
    }
    try {
      let url = `/api/admin/families?projectId=${projId}&status=active&limit=100`;
      if (villageId) url += `&villageId=${villageId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFamilies(data.items || data.families || []);
      }
    } catch (e) {
      console.error("Failed to load families:", e);
    }
  };

  // Load Stakeholders for Stakeholder Modal
  const loadStakeholders = async (projId) => {
    if (!projId) {
      setStakeholders([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/stakeholders?projectId=${projId}&status=active`);
      const data = await res.json();
      if (data.success) setStakeholders(data.items || data.stakeholders || []);
    } catch (e) {
      console.error("Failed to load stakeholders:", e);
    }
  };

  // Open Single Family Assignment Modal
  const openSingleModal = () => {
    setFormProject(projectFilter || (projects[0]?.id || ""));
    setFormRound(roundFilter || "");
    setFormWorker("");
    setFormFamilyMandal("");
    setFormFamilyVillage("");
    setFormFamilyId("");
    setFormDueDate("");
    setFormError("");

    if (projectFilter || projects[0]?.id) {
      const pId = projectFilter || projects[0]?.id;
      loadProjectGeos(pId);
      loadProjectFamilies(pId);
    }

    setIsSingleModalOpen(true);
  };

  // Submit Single Family Assignment
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formProject || !formRound || !formWorker || !formFamilyId) {
      setFormError("Project, Survey Round, Field Worker, and Family are all required.");
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: formProject,
          surveyRoundId: formRound,
          fieldWorkerId: formWorker,
          familyId: formFamilyId,
          dueDate: formDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create assignment");
      }

      setSuccessMessage(`Assignment ${data.item.assignmentCode} created successfully!`);
      setIsSingleModalOpen(false);
      fetchAssignments();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Village Batch Modal
  const openBatchModal = () => {
    setBatchProject(projectFilter || (projects[0]?.id || ""));
    setBatchRound(roundFilter || "");
    setBatchMandal("");
    setBatchVillage("");
    setBatchWorker("");
    setBatchDueDate("");
    setBatchStep(1);
    setBatchPreview(null);
    setBatchSummary(null);
    setBatchError("");

    if (projectFilter || projects[0]?.id) {
      loadProjectGeos(projectFilter || projects[0]?.id);
    }

    setIsBatchModalOpen(true);
  };

  // Preview Village Batch
  const handleBatchPreview = async () => {
    setBatchError("");
    if (!batchProject || !batchRound || !batchVillage || !batchWorker) {
      setBatchError("Please select Project, Survey Round, Village, and Field Worker.");
      return;
    }

    try {
      setBatchLoading(true);
      const params = new URLSearchParams({
        projectId: batchProject,
        surveyRoundId: batchRound,
        villageId: batchVillage,
      });

      const res = await fetch(`/api/admin/assignments/preview-batch?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to preview village batch");
      }

      setBatchPreview(data.preview);
      setBatchStep(2);
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Execute Village Batch
  const handleBatchExecute = async () => {
    setBatchError("");
    try {
      setBatchLoading(true);
      const res = await fetch("/api/admin/assignments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: batchProject,
          surveyRoundId: batchRound,
          villageId: batchVillage,
          fieldWorkerId: batchWorker,
          dueDate: batchDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Batch assignment failed");
      }

      setBatchSummary(data.summary);
      setBatchStep(3);
      fetchAssignments();
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Open Stakeholder Modal
  const openStakeholderModal = () => {
    setStkProject(projectFilter || (projects[0]?.id || ""));
    setStkRound(roundFilter || "");
    setStkCategory("asha");
    setStkStakeholderId("");
    setStkWorker("");
    setStkDueDate("");
    setStkError("");

    if (projectFilter || projects[0]?.id) {
      loadStakeholders(projectFilter || projects[0]?.id);
    }

    setIsStakeholderModalOpen(true);
  };

  // Submit Stakeholder Task
  const handleStakeholderSubmit = async (e) => {
    e.preventDefault();
    setStkError("");

    if (!stkProject || !stkRound || !stkCategory || !stkStakeholderId || !stkWorker) {
      setStkError("Project, Survey Round, Category, Stakeholder, and Worker are required.");
      return;
    }

    try {
      setStkSubmitting(true);
      const res = await fetch("/api/admin/assignments/stakeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: stkProject,
          surveyRoundId: stkRound,
          category: stkCategory,
          stakeholderId: stkStakeholderId,
          fieldWorkerId: stkWorker,
          dueDate: stkDueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create stakeholder task");
      }

      setSuccessMessage(`Stakeholder task ${data.item.taskCode} assigned successfully!`);
      setIsStakeholderModalOpen(false);
      fetchAssignments();
    } catch (err) {
      setStkError(err.message);
    } finally {
      setStkSubmitting(false);
    }
  };

  // Open Reassign Modal
  const openReassignModal = (assignment) => {
    setSelectedAssignment(assignment);
    setReassignWorkerId("");
    setReassignReason("");
    setReassignError("");
    setIsReassignModalOpen(true);
  };

  // Submit Reassign
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    setReassignError("");

    if (!reassignWorkerId) {
      setReassignError("Please select a new active field worker.");
      return;
    }

    try {
      setReassignSubmitting(true);
      const res = await fetch(`/api/admin/assignments/${selectedAssignment.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newWorkerId: reassignWorkerId,
          reason: reassignReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reassign assignment");
      }

      setSuccessMessage(data.message || "Assignment reassigned successfully");
      setIsReassignModalOpen(false);
      fetchAssignments();
    } catch (err) {
      setReassignError(err.message);
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (assignment) => {
    setSelectedAssignment(assignment);
    setCancelReason("");
    setCancelError("");
    setIsCancelModalOpen(true);
  };

  // Submit Cancel
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelError("");

    if (!cancelReason || cancelReason.trim().length < 3) {
      setCancelError("A cancellation reason of at least 3 characters is mandatory.");
      return;
    }

    try {
      setCancelSubmitting(true);
      const res = await fetch(`/api/admin/assignments/${selectedAssignment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel assignment");
      }

      setSuccessMessage("Assignment cancelled successfully");
      setIsCancelModalOpen(false);
      fetchAssignments();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Selected Round Light-touch status
  const currentStkRound = rounds.find((r) => (r.id || r._id) === stkRound);
  const isLightTouchDisabled = stkCategory === "light_touch" && currentStkRound && !currentStkRound.enableLightTouch;

  // Filtered rounds for project selector
  const availableRounds = rounds.filter((r) => {
    if (!formProject) return true;
    const rProj = r.projectId || r.project?._id || r.project;
    return rProj === formProject;
  });

  const availableBatchRounds = rounds.filter((r) => {
    if (!batchProject) return true;
    const rProj = r.projectId || r.project?._id || r.project;
    return rProj === batchProject;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Actions & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Fieldwork Assignment Engine
          </h2>
          <p className="text-xs text-slate-500">
            Dispatch household surveys, village batches, and shared stakeholder tasks to active Field Workers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openStakeholderModal}
            className="flex items-center gap-1.5"
          >
            <UsersIcon className="w-4 h-4 text-slate-600" />
            <span>Stakeholder Task</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={openBatchModal}
            className="flex items-center gap-1.5"
          >
            <MapPinIcon className="w-4 h-4" />
            <span>Village Batch</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openSingleModal}
            className="flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Assign Family</span>
          </Button>
        </div>
      </div>

      {/* Global Toast */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Assignments
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{counts.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/60 border-slate-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Assigned (Pending)
            </div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{counts.assigned}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              In Progress
            </div>
            <div className="text-2xl font-bold text-amber-800 mt-1">{counts.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Completed
            </div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">{counts.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 border-rose-200">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              Cancelled
            </div>
            <div className="text-2xl font-bold text-rose-800 mt-1">{counts.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <label htmlFor={searchId} className="sr-only">Search</label>
              <Input
                id={searchId}
                placeholder="Search Code or Family..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs py-1.5"
              />
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setRoundFilter("");
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>

            {/* Survey Round Filter */}
            <select
              value={roundFilter}
              onChange={(e) => {
                setRoundFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Survey Rounds</option>
              {rounds
                .filter((r) => !projectFilter || (r.projectId || r.project?._id || r.project) === projectFilter)
                .map((r, rIdx) => (
                  <option key={r.id || r._id || `rnd-flt-${rIdx}`} value={r.id || r._id}>
                    {r.code} - {r.name}
                  </option>
                ))}
            </select>

            {/* Worker Filter */}
            <select
              value={workerFilter}
              onChange={(e) => {
                setWorkerFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Field Workers</option>
              {workers.map((w) => (
                <option key={w.id || w._id} value={w.id || w._id}>
                  {w.name} ({w.email})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 py-1.5 px-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Assignments Found</h3>
            <p className="text-xs text-slate-500">
              No field assignments match the current filter criteria. Assign a family or batch-assign a village to get started.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="primary" onClick={openSingleModal}>
                Assign First Family
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {assignments.map((item) => {
            const statusConfig = STATUS_BADGES[item.status] || { variant: "neutral", label: item.status };
            const isAssignable = item.status === "assigned" || item.status === "in_progress";
            const isReassigned = item.reassignmentHistory && item.reassignmentHistory.length > 0;

            return (
              <Card
                key={item.id || item._id}
                className="hover:border-slate-300 transition-shadow shadow-xs p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Code, Target, Round */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {item.assignmentCode}
                      </span>
                      <Badge variant={item.assignmentType === "village_batch" ? "secondary" : "neutral"} size="sm">
                        {item.assignmentType === "village_batch" ? "Village Batch" : "Single Family"}
                      </Badge>
                      <Badge variant={statusConfig.variant} size="sm">
                        {statusConfig.label}
                      </Badge>
                      {isReassigned && (
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          Reassigned ({item.reassignmentHistory.length}x)
                        </span>
                      )}
                    </div>

                    {/* Family and Location */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div>
                        Household:{" "}
                        <strong className="text-slate-800">
                          {item.family?.familyCode || "N/A"}
                        </strong>
                        {item.family?.householdHeadName && (
                          <span className="text-slate-500 ml-1">
                            ({item.family.householdHeadName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {item.village?.name || "Village"}, {item.mandal?.name || "Mandal"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Round: {item.surveyRound?.code || item.surveyRound?.name || "Round"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Worker & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-slate-800">
                        {item.fieldWorker?.name || "Unassigned"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.fieldWorker?.email}
                      </div>
                      {item.dueDate && (
                        <div className="text-[11px] text-amber-600 flex items-center sm:justify-end gap-1 mt-0.5">
                          <ClockIcon className="w-3 h-3" />
                          <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(item);
                          setIsDetailsModalOpen(true);
                        }}
                        className="text-xs py-1 px-2.5"
                      >
                        Details
                      </Button>

                      {isAssignable && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openReassignModal(item)}
                            className="text-xs py-1 px-2.5"
                          >
                            Reassign
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openCancelModal(item)}
                            className="text-xs py-1 px-2.5"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cancellation notice */}
                {item.status === "cancelled" && item.cancellationReason && (
                  <div className="mt-2.5 pt-2 border-t border-rose-100 text-[11px] text-rose-700 flex items-center gap-1.5 bg-rose-50/50 p-2 rounded">
                    <strong>Cancellation Reason:</strong>
                    <span>{item.cancellationReason}</span>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <div>
                Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount} assignments
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
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
      )}

      {/* MODAL 1: Single Family Assignment */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Assign Single Family"
        size="lg"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Project *</label>
              <select
                value={formProject}
                onChange={(e) => {
                  setFormProject(e.target.value);
                  setFormRound("");
                  setFormFamilyMandal("");
                  setFormFamilyVillage("");
                  setFormFamilyId("");
                  loadProjectGeos(e.target.value);
                  loadProjectFamilies(e.target.value);
                }}
                required
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Survey Round */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Survey Round *</label>
              <select
                value={formRound}
                onChange={(e) => setFormRound(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Survey Round</option>
                {availableRounds.map((r, rIdx) => (
                  <option key={r.id || r._id || `s-rnd-${rIdx}`} value={r.id || r._id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Filters to Narrow Down Family */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Filter by Mandal (Optional)</label>
              <select
                value={formFamilyMandal}
                onChange={(e) => {
                  setFormFamilyMandal(e.target.value);
                  setFormFamilyVillage("");
                  setFormFamilyId("");
                }}
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Mandals</option>
                {mandals.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Filter by Village (Optional)</label>
              <select
                value={formFamilyVillage}
                onChange={(e) => {
                  setFormFamilyVillage(e.target.value);
                  setFormFamilyId("");
                  loadProjectFamilies(formProject, e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Villages</option>
                {villages
                  .filter((v) => !formFamilyMandal || (v.mandalId || v.mandal?._id || v.mandal) === formFamilyMandal)
                  .map((v) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Family Selector */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Family *</label>
            <select
              value={formFamilyId}
              onChange={(e) => setFormFamilyId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Choose household...</option>
              {families.map((fam) => (
                <option key={fam.id || fam._id} value={fam.id || fam._id}>
                  {fam.familyCode} — {fam.householdHeadName} ({fam.village?.name || "Village"})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Showing active families in the selected project catchment.
            </p>
          </div>

          {/* Field Worker & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Assign Field Worker *</label>
              <select
                value={formWorker}
                onChange={(e) => setFormWorker(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Field Worker</option>
                {workers.map((w) => (
                  <option key={w.id || w._id} value={w.id || w._id}>
                    {w.name} ({w.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Target Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="text-xs py-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSingleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={formSubmitting}
            >
              {formSubmitting ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Village Batch Assignment (3-Step Wizard) */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={
          batchStep === 1
            ? "Village Batch Assignment"
            : batchStep === 2
            ? "Review & Confirm Village Batch"
            : "Batch Assignment Summary"
        }
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {batchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {batchError}
            </div>
          )}

          {/* STEP 1: CONFIGURE */}
          {batchStep === 1 && (
            <div className="space-y-3.5">
              <p className="text-slate-500">
                Select a target village to evaluate and assign all eligible households in bulk to a designated Field Worker.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Project *</label>
                  <select
                    value={batchProject}
                    onChange={(e) => {
                      setBatchProject(e.target.value);
                      setBatchRound("");
                      setBatchMandal("");
                      setBatchVillage("");
                      loadProjectGeos(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Survey Round *</label>
                  <select
                    value={batchRound}
                    onChange={(e) => setBatchRound(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Round</option>
                    {availableBatchRounds.map((r, rIdx) => (
                      <option key={r.id || r._id || `b-rnd-${rIdx}`} value={r.id || r._id}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mandal Filter</label>
                  <select
                    value={batchMandal}
                    onChange={(e) => {
                      setBatchMandal(e.target.value);
                      setBatchVillage("");
                    }}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Mandals</option>
                    {mandals.map((m) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Village *</label>
                  <select
                    value={batchVillage}
                    onChange={(e) => setBatchVillage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Village</option>
                    {villages
                      .filter((v) => !batchMandal || (v.mandalId || v.mandal?._id || v.mandal) === batchMandal)
                      .map((v) => (
                        <option key={v.id || v._id} value={v.id || v._id}>
                          {v.name} ({v.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Field Worker *</label>
                  <select
                    value={batchWorker}
                    onChange={(e) => setBatchWorker(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Field Worker</option>
                    {workers.map((w) => (
                      <option key={w.id || w._id} value={w.id || w._id}>
                        {w.name} ({w.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Optional Due Date</label>
                  <Input
                    type="date"
                    value={batchDueDate}
                    onChange={(e) => setBatchDueDate(e.target.value)}
                    className="text-xs py-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setIsBatchModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={batchLoading}
                  onClick={handleBatchPreview}
                >
                  {batchLoading ? "Evaluating Eligibility..." : "Preview Eligibility →"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {batchStep === 2 && batchPreview && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-1">
                  Target: {batchPreview.village.name} ({batchPreview.village.code})
                </h4>
                <p className="text-slate-500">
                  Worker: {workers.find((w) => (w.id || w._id) === batchWorker)?.name}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total In Village</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{batchPreview.totalFamilies}</div>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Eligible to Assign</div>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5">{batchPreview.eligibleCount}</div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">Already Assigned</div>
                  <div className="text-xl font-bold text-amber-800 mt-0.5">{batchPreview.alreadyAssignedCount}</div>
                </div>

                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase">Inactive / Skipped</div>
                  <div className="text-xl font-bold text-rose-800 mt-0.5">{batchPreview.ineligibleCount}</div>
                </div>
              </div>

              {/* Preview Lists */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">
                  Eligible Households ({batchPreview.eligibleCount}):
                </div>
                {batchPreview.eligibleCount === 0 ? (
                  <p className="text-slate-400 italic">No households eligible for new assignment in this round.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-white">
                    {batchPreview.eligibleFamilies.map((fam, fIdx) => (
                      <div key={fam.id || `elg-${fIdx}`} className="flex items-center justify-between text-[11px] py-1 px-2 hover:bg-slate-50 rounded">
                        <span className="font-mono font-bold text-slate-800">{fam.familyCode}</span>
                        <span className="text-slate-600">{fam.householdHeadName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Already Assigned List */}
              {batchPreview.alreadyAssignedCount > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold text-amber-700">
                    Will be Skipped (Already Assigned - {batchPreview.alreadyAssignedCount}):
                  </div>
                  <div className="max-h-24 overflow-y-auto border border-amber-100 rounded-lg p-2 space-y-1 bg-amber-50/40">
                    {batchPreview.alreadyAssignedFamilies.map((fam, aIdx) => (
                      <div key={fam.id || `asg-${aIdx}`} className="flex items-center justify-between text-[11px] text-amber-900">
                        <span className="font-mono">{fam.familyCode}</span>
                        <span>{fam.householdHeadName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setBatchStep(1)}>
                  ← Back to Options
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={batchLoading || batchPreview.eligibleCount === 0}
                  onClick={handleBatchExecute}
                >
                  {batchLoading ? "Processing Batch..." : `Confirm & Create ${batchPreview.eligibleCount} Assignments`}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS SUMMARY */}
          {batchStep === 3 && batchSummary && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">
                  Batch Assignment Completed!
                </h4>
                <p className="text-emerald-700 text-xs">
                  Successfully created {batchSummary.createdCount} assignments for village {batchSummary.village?.name}.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-emerald-50/80 rounded border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Created</div>
                  <div className="text-lg font-bold text-emerald-900">{batchSummary.createdCount}</div>
                </div>
                <div className="p-2.5 bg-amber-50/80 rounded border border-amber-200">
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">Skipped (Assigned)</div>
                  <div className="text-lg font-bold text-amber-900">{batchSummary.alreadyAssignedCount}</div>
                </div>
                <div className="p-2.5 bg-rose-50/80 rounded border border-rose-200">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase">Failures</div>
                  <div className="text-lg font-bold text-rose-900">{batchSummary.failedCount}</div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button variant="primary" size="sm" onClick={() => setIsBatchModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 3: Stakeholder Task Assignment */}
      <Modal
        isOpen={isStakeholderModalOpen}
        onClose={() => setIsStakeholderModalOpen(false)}
        title="Assign Stakeholder Interview"
        size="md"
      >
        <form onSubmit={handleStakeholderSubmit} className="space-y-3.5 text-xs">
          {stkError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {stkError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Project *</label>
            <select
              value={stkProject}
              onChange={(e) => {
                setStkProject(e.target.value);
                setStkRound("");
                setStkStakeholderId("");
                loadStakeholders(e.target.value);
              }}
              required
              className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Survey Round *</label>
            <select
              value={stkRound}
              onChange={(e) => setStkRound(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Survey Round</option>
              {rounds
                .filter((r) => !stkProject || (r.projectId || r.project?._id || r.project) === stkProject)
                .map((r, rIdx) => (
                  <option key={r.id || r._id || `stk-rnd-${rIdx}`} value={r.id || r._id}>
                    {r.code} - {r.name} {r.enableLightTouch ? "(Light-touch Enabled)" : "(No Light-touch)"}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Questionnaire Category *</label>
            <select
              value={stkCategory}
              onChange={(e) => setStkCategory(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="asha">ASHA Interview</option>
              <option value="facility_staff">Facility Staff Interview</option>
              <option value="light_touch">Light-Touch Verification</option>
              <option value="govt_official">Government Official Interview</option>
            </select>
          </div>

          {/* Light-touch notice */}
          {isLightTouchDisabled && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px]">
              ⚠️ Light-touch surveys are disabled on this Survey Round. Please select a round with Light-Touch enabled or choose another questionnaire category.
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Target Stakeholder *</label>
            <select
              value={stkStakeholderId}
              onChange={(e) => setStkStakeholderId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Choose Stakeholder...</option>
              {stakeholders.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.fullName} ({s.stakeholderType}) — {s.designation || "Stakeholder"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Field Worker *</label>
              <select
                value={stkWorker}
                onChange={(e) => setStkWorker(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Worker</option>
                {workers.map((w) => (
                  <option key={w.id || w._id} value={w.id || w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Due Date (Optional)</label>
              <Input
                type="date"
                value={stkDueDate}
                onChange={(e) => setStkDueDate(e.target.value)}
                className="text-xs py-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsStakeholderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={stkSubmitting || isLightTouchDisabled}
            >
              {stkSubmitting ? "Assigning..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Reassign Assignment */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Assignment"
        size="md"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-3.5 text-xs">
          {reassignError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {reassignError}
            </div>
          )}

          {selectedAssignment && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div>
                Assignment: <strong>{selectedAssignment.assignmentCode}</strong>
              </div>
              <div>
                Current Worker:{" "}
                <strong>{selectedAssignment.fieldWorker?.name}</strong> (
                {selectedAssignment.fieldWorker?.email})
              </div>
              <div>
                Household: <strong>{selectedAssignment.family?.familyCode}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">New Field Worker *</label>
            <select
              value={reassignWorkerId}
              onChange={(e) => setReassignWorkerId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select New Field Worker</option>
              {workers
                .filter((w) => (w.id || w._id) !== (selectedAssignment?.fieldWorker?._id || selectedAssignment?.fieldWorker?.id))
                .map((w) => (
                  <option key={w.id || w._id} value={w.id || w._id}>
                    {w.name} ({w.email})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason for Reassignment</label>
            <Input
              placeholder="e.g. Worker reallocated to different sector"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The previous worker and audit details will be permanently preserved in history.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={reassignSubmitting}>
              {reassignSubmitting ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Cancel Assignment */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Assignment"
        size="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs">
          {cancelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {cancelError}
            </div>
          )}

          {selectedAssignment && (
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900 space-y-1">
              <p className="font-semibold">
                Are you sure you want to cancel {selectedAssignment.assignmentCode}?
              </p>
              <p className="text-[11px] text-rose-700">
                Target: {selectedAssignment.family?.familyCode} assigned to {selectedAssignment.fieldWorker?.name}.
              </p>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Cancellation Reason *</label>
            <Input
              required
              placeholder="Mandatory cancellation reason (min 3 chars)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A cancellation reason is required for compliance and audit logs.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={cancelSubmitting}>
              {cancelSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: Assignment Details */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Assignment Details — ${selectedAssignment?.assignmentCode || ""}`}
        size="lg"
      >
        {selectedAssignment && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status</span>
                <span className="font-bold text-slate-800 capitalize">{selectedAssignment.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Type</span>
                <span className="font-bold text-slate-800 capitalize">
                  {selectedAssignment.assignmentType?.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Assigned On</span>
                <span className="text-slate-700">
                  {new Date(selectedAssignment.assignedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Project</span>
                <span className="text-slate-700">{selectedAssignment.project?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Survey Round</span>
                <span className="text-slate-700">{selectedAssignment.surveyRound?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Due Date</span>
                <span className="text-slate-700">
                  {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : "None"}
                </span>
              </div>
            </div>

            {/* Household Info */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
              <h4 className="font-semibold text-slate-800">Household Target</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Code: <strong>{selectedAssignment.family?.familyCode}</strong></div>
                <div>Head: <strong>{selectedAssignment.family?.householdHeadName}</strong></div>
                <div>Village: {selectedAssignment.village?.name}</div>
                <div>Mandal: {selectedAssignment.mandal?.name}</div>
              </div>
            </div>

            {/* Reassignment Trail */}
            {selectedAssignment.reassignmentHistory?.length > 0 && (
              <div className="border border-purple-200 bg-purple-50/40 rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-purple-900">Reassignment History</h4>
                <div className="space-y-1.5">
                  {selectedAssignment.reassignmentHistory.map((h, i) => (
                    <div key={i} className="text-[11px] text-purple-800 border-l-2 border-purple-400 pl-2">
                      Previously assigned to <strong>{h.previousWorker?.name || "Worker"}</strong> on{" "}
                      {new Date(h.reassignedAt).toLocaleString()}
                      {h.reason && ` — Reason: "${h.reason}"`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
