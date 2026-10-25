"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  HomeIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SearchIcon,
  EditIcon,
  StarIcon,
  EyeIcon,
  CloseIcon,
} from "@/components/common/Icons";
import AddStakeholderModal from "@/components/common/AddStakeholderModal";

const CHARACTERISTICS_LABELS = {
  tribal: "Tribal",
  women_headed: "Women-Headed",
  elderly_60_plus: "Elderly 60+",
};

const CARE_REASONS_LABELS = {
  pregnancy: "Pregnancy",
  child_under_5: "Child Under 5",
  chronic_illness: "Chronic Illness (TB, Diabetes, BP)",
  elderly_care: "Elderly Care",
  other: "Other",
};

const TRAVEL_TIME_LABELS = {
  under_30_min: "Under 30 minutes",
  "30_min_to_1_hour": "30 mins – 1 hour",
  "1_to_2_hours": "1 – 2 hours",
  over_2_hours: "Over 2 hours",
};

export default function FamilyManager() {
  const [families, setFamilies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allMandals, setAllMandals] = useState([]);
  const [allFacilities, setAllFacilities] = useState([]);
  const [allVillages, setAllVillages] = useState([]);
  const [allAshas, setAllAshas] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [mandalFilter, setMandalFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [shortlistFilter, setShortlistFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Messages
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // PII Privacy
  const [revealedPhones, setRevealedPhones] = useState({});

  // View Details Modal State
  const [viewingFamily, setViewingFamily] = useState(null);

  // Duplicate Confirmation State
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Add / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddStakeholderOpen, setIsAddStakeholderOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("section-location");

  function scrollToSection(sectionId) {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Prevent background scroll when any modal is open
  useEffect(() => {
    if (isFormOpen || duplicateWarning || viewingFamily) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFormOpen, duplicateWarning, viewingFamily]);

  // Handle Escape key to dismiss modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (duplicateWarning) setDuplicateWarning(null);
        else if (viewingFamily) setViewingFamily(null);
        else if (isFormOpen) setIsFormOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duplicateWarning, viewingFamily, isFormOpen]);

  // Form Fields
  const [projectId, setProjectId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [ashaId, setAshaId] = useState("");
  const [ashaIds, setAshaIds] = useState([""]);
  const [doctorId, setDoctorId] = useState("");
  const [stakeholderModalType, setStakeholderModalType] = useState("asha");
  const [familyDoctorInterviews, setFamilyDoctorInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [householdHeadName, setHouseholdHeadName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOwner, setPhoneOwner] = useState("own");
  const [householdCharacteristics, setHouseholdCharacteristics] = useState([]);
  const [visitedPHCLast3Months, setVisitedPHCLast3Months] = useState("yes");
  const [agreesToContact, setAgreesToContact] = useState("yes");
  const [travelTimeToPHC, setTravelTimeToPHC] = useState("under_30_min");
  const [reasonsForRepeatedCare, setReasonsForRepeatedCare] = useState([]);
  const [otherCareReason, setOtherCareReason] = useState("");
  const [receivedDroneService, setReceivedDroneService] = useState("no");
  const [ashaRemarks, setAshaRemarks] = useState("");
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => {
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFamilies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    projectFilter,
    mandalFilter,
    facilityFilter,
    villageFilter,
    shortlistFilter,
    statusFilter,
    page,
  ]);

  async function fetchMetadata() {
    try {
      const [projRes, manRes, facRes, vilRes, ashaRes, docRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/mandals?status=active&limit=200"),
        fetch("/api/admin/facilities?status=active&limit=300"),
        fetch("/api/admin/villages?status=active&limit=500"),
        fetch("/api/admin/stakeholders?stakeholderType=asha&status=active&limit=300"),
        fetch("/api/admin/stakeholders?stakeholderType=doctor&status=active&limit=300"),
      ]);

      const [projData, manData, facData, vilData, ashaData, docData] = await Promise.all([
        projRes.json(),
        manRes.json(),
        facRes.json(),
        vilRes.json(),
        ashaRes.json(),
        docRes.json(),
      ]);

      if (projRes.ok && projData.success) setProjects(projData.items || []);
      if (manRes.ok && manData.success) setAllMandals(manData.items || []);
      if (facRes.ok && facData.success) setAllFacilities(facData.items || []);
      if (vilRes.ok && vilData.success) setAllVillages(vilData.items || []);
      if (ashaRes.ok && ashaData.success) setAllAshas(ashaData.items || []);
      if (docRes.ok && docData.success) setAllDoctors(docData.items || []);
    } catch {
      // Ignored
    }
  }

  async function fetchFamilies() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (projectFilter) params.set("projectId", projectFilter);
      if (mandalFilter) params.set("mandalId", mandalFilter);
      if (facilityFilter) params.set("facilityId", facilityFilter);
      if (villageFilter) params.set("villageId", villageFilter);
      if (shortlistFilter) params.set("shortlisted", shortlistFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/families?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load families");

      setFamilies(data.items || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 15) || 1);
      setTotalCount(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // --- CASCADING FORM DROPDOWNS ---
  const formMandals = allMandals.filter(
    (m) => !projectId || m.projectId === projectId || m.project?.id === projectId
  );

  const formFacilities = allFacilities.filter((f) => {
    const matchesProj = !projectId || f.projectId === projectId || f.project?.id === projectId;
    const matchesMandal = !mandalId || f.mandalId === mandalId || f.mandal?.id === mandalId;
    return matchesProj && matchesMandal;
  });

  const formVillages = allVillages.filter((v) => {
    const matchesProj = !projectId || v.projectId === projectId || v.project?.id === projectId;
    const matchesMandal = !mandalId || v.mandalId === mandalId || v.mandal?.id === mandalId;
    const matchesFacility = !facilityId || v.facilityId === facilityId || v.facility?.id === facilityId;
    return matchesProj && matchesMandal && matchesFacility;
  });

  const formAshas = allAshas.filter((a) => {
    const matchesProj = !projectId || a.projectId === projectId || a.project?.id === projectId;
    const matchesMandal = !mandalId || a.mandalId === mandalId || a.mandal?.id === mandalId;
    return matchesProj && matchesMandal;
  });

  const formDoctors = allDoctors.filter((d) => {
    const matchesProj = !projectId || d.projectId === projectId || d.project?.id === projectId;
    const matchesFac = !facilityId || d.facilityId === facilityId || d.facility?.id === facilityId;
    const matchesMandal = !mandalId || d.mandalId === mandalId || d.mandal?.id === mandalId;
    return matchesProj && (matchesFac || matchesMandal);
  });

  function handleAddAshaSlot() {
    setAshaIds((prev) => [...prev, ""]);
  }

  function handleRemoveAshaSlot(index) {
    setAshaIds((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length === 0 ? [""] : updated;
    });
  }

  function handleAshaChange(index, value) {
    setAshaIds((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function openAddAshaModal() {
    setStakeholderModalType("asha");
    setIsAddStakeholderOpen(true);
  }

  function openAddDoctorModal() {
    setStakeholderModalType("doctor");
    setIsAddStakeholderOpen(true);
  }

  function handleFormProjectChange(newProjId) {
    setProjectId(newProjId);
    const validMandals = allMandals.filter(
      (m) => !newProjId || m.projectId === newProjId || m.project?.id === newProjId
    );
    const newMandalId = validMandals.length > 0 ? validMandals[0].id : "";
    setMandalId(newMandalId);

    const validFacilities = allFacilities.filter(
      (f) =>
        (!newProjId || f.projectId === newProjId || f.project?.id === newProjId) &&
        (!newMandalId || f.mandalId === newMandalId || f.mandal?.id === newMandalId)
    );
    const newFacilityId = validFacilities.length > 0 ? validFacilities[0].id : "";
    setFacilityId(newFacilityId);

    const validVillages = allVillages.filter(
      (v) =>
        (!newProjId || v.projectId === newProjId || v.project?.id === newProjId) &&
        (!newMandalId || v.mandalId === newMandalId || v.mandal?.id === newMandalId) &&
        (!newFacilityId || v.facilityId === newFacilityId || v.facility?.id === newFacilityId)
    );
    setVillageId(validVillages.length > 0 ? validVillages[0].id : "");
    setAshaId("");
    setAshaIds([""]);
    setDoctorId("");
  }

  function handleFormMandalChange(newMandalId) {
    setMandalId(newMandalId);
    const validFacilities = allFacilities.filter(
      (f) =>
        (!projectId || f.projectId === projectId || f.project?.id === projectId) &&
        (!newMandalId || f.mandalId === newMandalId || f.mandal?.id === newMandalId)
    );
    const newFacilityId = validFacilities.length > 0 ? validFacilities[0].id : "";
    setFacilityId(newFacilityId);

    const validVillages = allVillages.filter(
      (v) =>
        (!projectId || v.projectId === projectId || v.project?.id === projectId) &&
        (!newMandalId || v.mandalId === newMandalId || v.mandal?.id === newMandalId) &&
        (!newFacilityId || v.facilityId === newFacilityId || v.facility?.id === newFacilityId)
    );
    setVillageId(validVillages.length > 0 ? validVillages[0].id : "");
    setAshaId("");
    setAshaIds([""]);
    setDoctorId("");
  }

  function handleFormFacilityChange(newFacilityId) {
    setFacilityId(newFacilityId);
    const validVillages = allVillages.filter(
      (v) =>
        (!projectId || v.projectId === projectId || v.project?.id === projectId) &&
        (!mandalId || v.mandalId === mandalId || v.mandal?.id === mandalId) &&
        (!newFacilityId || v.facilityId === newFacilityId || v.facility?.id === newFacilityId)
    );
    setVillageId(validVillages.length > 0 ? validVillages[0].id : "");
  }

  // --- CASCADING FILTER DROPDOWNS ---
  const filterMandals = allMandals.filter(
    (m) => !projectFilter || m.projectId === projectFilter || m.project?.id === projectFilter
  );

  const filterFacilities = allFacilities.filter((f) => {
    const matchesProj = !projectFilter || f.projectId === projectFilter || f.project?.id === projectFilter;
    const matchesMandal = !mandalFilter || f.mandalId === mandalFilter || f.mandal?.id === mandalFilter;
    return matchesProj && matchesMandal;
  });

  const filterVillages = allVillages.filter((v) => {
    const matchesProj = !projectFilter || v.projectId === projectFilter || v.project?.id === projectFilter;
    const matchesMandal = !mandalFilter || v.mandalId === mandalFilter || v.mandal?.id === mandalFilter;
    const matchesFacility = !facilityFilter || v.facilityId === facilityFilter || v.facility?.id === facilityFilter;
    return matchesProj && matchesMandal && matchesFacility;
  });

  function togglePhoneReveal(id) {
    setRevealedPhones((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function maskPhone(p) {
    if (!p) return "None";
    if (p.length < 4) return "••••";
    return p.slice(0, 2) + "••••••" + p.slice(-2);
  }

  function openCreateForm() {
    setEditingId(null);
    setDuplicateWarning(null);
    setActiveSection("section-location");
    const defaultProjId = projects.length > 0 ? projects[0].id : "";
    setProjectId(defaultProjId);

    const validMandals = allMandals.filter(
      (m) => !defaultProjId || m.projectId === defaultProjId || m.project?.id === defaultProjId
    );
    const defaultMandalId = validMandals.length > 0 ? validMandals[0].id : "";
    setMandalId(defaultMandalId);

    const validFacilities = allFacilities.filter(
      (f) =>
        (!defaultProjId || f.projectId === defaultProjId || f.project?.id === defaultProjId) &&
        (!defaultMandalId || f.mandalId === defaultMandalId || f.mandal?.id === defaultMandalId)
    );
    const defaultFacilityId = validFacilities.length > 0 ? validFacilities[0].id : "";
    setFacilityId(defaultFacilityId);

    const validVillages = allVillages.filter(
      (v) =>
        (!defaultProjId || v.projectId === defaultProjId || v.project?.id === defaultProjId) &&
        (!defaultMandalId || v.mandalId === defaultMandalId || v.mandal?.id === defaultMandalId) &&
        (!defaultFacilityId || v.facilityId === defaultFacilityId || v.facility?.id === defaultFacilityId)
    );
    setVillageId(validVillages.length > 0 ? validVillages[0].id : "");
    setAshaId("");
    setAshaIds([""]);
    setDoctorId("");

    setHouseholdHeadName("");
    setPhoneNumber("");
    setPhoneOwner("own");
    setHouseholdCharacteristics([]);
    setVisitedPHCLast3Months("yes");
    setAgreesToContact("yes");
    setTravelTimeToPHC("under_30_min");
    setReasonsForRepeatedCare([]);
    setOtherCareReason("");
    setReceivedDroneService("no");
    setAshaRemarks("");
    setShortlisted(false);

    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function openEditForm(family) {
    setEditingId(family.id);
    setDuplicateWarning(null);
    setActiveSection("section-location");

    setProjectId(family.projectId || family.project?.id || "");
    setMandalId(family.mandalId || family.mandal?.id || "");
    setFacilityId(family.facilityId || family.facility?.id || "");
    setVillageId(family.villageId || family.village?.id || "");
    const existingAshaIds = Array.isArray(family.ashaIds) && family.ashaIds.length > 0
      ? family.ashaIds
      : family.ashas?.length > 0
      ? family.ashas.map((a) => a.id || a._id)
      : (family.ashaId || family.asha?.id ? [family.ashaId || family.asha.id] : [""]);
    setAshaIds(existingAshaIds.length > 0 ? existingAshaIds : [""]);
    setAshaId(existingAshaIds[0] || "");
    setDoctorId(family.doctorId || family.doctor?.id || "");

    setHouseholdHeadName(family.householdHeadName || "");
    setPhoneNumber(family.phoneNumber || "");
    setPhoneOwner(family.phoneOwner || "own");
    setHouseholdCharacteristics(family.householdCharacteristics || []);
    setVisitedPHCLast3Months(family.visitedPHCLast3Months || "yes");
    setAgreesToContact(family.agreesToContact || "yes");
    setTravelTimeToPHC(family.travelTimeToPHC || "under_30_min");
    setReasonsForRepeatedCare(family.reasonsForRepeatedCare || []);
    setOtherCareReason(family.otherCareReason || "");
    setReceivedDroneService(family.receivedDroneService || "no");
    setAshaRemarks(family.ashaRemarks || "");
    setShortlisted(Boolean(family.shortlisted));

    setIsFormOpen(true);
    setActionMessage("");
    setError("");
  }

  function toggleCharacteristic(key) {
    setHouseholdCharacteristics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleCareReason(key) {
    setReasonsForRepeatedCare((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e, forceConfirm = false) {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionMessage("");

    try {
      const resolvedAshas = [...new Set(ashaIds.filter(Boolean))];
      const payload = {
        projectId,
        mandalId,
        facilityId,
        villageId,
        ashaId: resolvedAshas[0] || null,
        ashaIds: resolvedAshas,
        doctorId: doctorId || null,
        householdHeadName: householdHeadName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneOwner,
        householdCharacteristics,
        visitedPHCLast3Months,
        agreesToContact,
        travelTimeToPHC,
        reasonsForRepeatedCare,
        otherCareReason: reasonsForRepeatedCare.includes("other") ? otherCareReason.trim() : "",
        receivedDroneService,
        ashaRemarks: ashaRemarks.trim(),
        shortlisted,
        confirmDuplicate: forceConfirm,
      };

      const url = editingId ? `/api/admin/families/${editingId}` : "/api/admin/families";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // If potential duplicate detected, prompt user for confirmation
        if (data.potentialDuplicate && data.matches) {
          setDuplicateWarning({
            matches: data.matches,
            message: data.error,
          });
          return;
        }
        throw new Error(data.error || "Operation failed");
      }

      setActionMessage(
        editingId ? "Family record updated successfully." : "Family registered successfully."
      );
      setIsFormOpen(false);
      setDuplicateWarning(null);
      fetchFamilies();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(family) {
    const nextStatus = family.status === "active" ? "inactive" : "active";
    const confirmMsg =
      nextStatus === "inactive"
        ? `Deactivate family ${family.familyCode} (${family.householdHeadName})? Historical data will be preserved.`
        : `Activate family ${family.familyCode}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/families/${family.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Status update failed");

      setActionMessage(`Family ${nextStatus === "active" ? "activated" : "deactivated"} successfully.`);
      fetchFamilies();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleShortlist(family) {
    const nextVal = !family.shortlisted;
    try {
      const res = await fetch(`/api/admin/families/${family.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: nextVal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update shortlist");

      setActionMessage(
        nextVal
          ? `Family ${family.familyCode} added to priority shortlist.`
          : `Family ${family.familyCode} removed from shortlist.`
      );
      fetchFamilies();
    } catch (err) {
      setError(err.message);
    }
  }

  const openFamilyDetails = async (fam) => {
    setViewingFamily(fam);
    setFamilyDoctorInterviews([]);
    if (fam?.id) {
      setLoadingInterviews(true);
      try {
        const res = await fetch(`/api/admin/families/${fam.id}/doctor-interviews`);
        if (res.ok) {
          const data = await res.json();
          setFamilyDoctorInterviews(data.data || []);
        }
      } catch (e) {
        console.error("Failed to load doctor interviews for family", e);
      } finally {
        setLoadingInterviews(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
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
          <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-rose-600 hover:text-rose-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control & Filter Bar */}
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
                placeholder="Search by Family Code (FAM-...), household head, or phone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[44px] sm:min-h-[40px]"
              />
            </div>
            <Button
              onClick={openCreateForm}
              variant="primary"
              className="flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[40px] px-5 font-bold shadow-md shadow-emerald-700/15 shrink-0 w-full sm:w-auto"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Add Family</span>
            </Button>
          </div>

          {/* Responsive Filters Grid (2 cols on mobile, 3 on tablet, 6 on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setMandalFilter("");
                  setFacilityFilter("");
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Mandal</label>
              <select
                value={mandalFilter}
                onChange={(e) => {
                  setMandalFilter(e.target.value);
                  setFacilityFilter("");
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Mandals</option>
                {filterMandals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Facility</label>
              <select
                value={facilityFilter}
                onChange={(e) => {
                  setFacilityFilter(e.target.value);
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Facilities</option>
                {filterFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Village</label>
              <select
                value={villageFilter}
                onChange={(e) => {
                  setVillageFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Villages</option>
                {filterVillages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Shortlist</label>
              <select
                value={shortlistFilter}
                onChange={(e) => {
                  setShortlistFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Families</option>
                <option value="true">Shortlisted Only</option>
                <option value="false">Not Shortlisted</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none min-h-[38px]"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {(search || projectFilter || mandalFilter || facilityFilter || villageFilter || shortlistFilter || statusFilter) && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500 text-[11px]">Filtered results active</span>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setProjectFilter("");
                  setMandalFilter("");
                  setFacilityFilter("");
                  setVillageFilter("");
                  setShortlistFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-[11px]"
              >
                Reset all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Families Directory Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Registered Households ({totalCount})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Master directory of surveyed households with health characteristics and contact consent
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="mt-2 text-xs">Loading registered families...</p>
            </div>
          ) : families.length === 0 ? (
            <div className="p-12 text-center">
              <HomeIcon className="mx-auto w-10 h-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No Families Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || projectFilter || mandalFilter || facilityFilter || villageFilter || shortlistFilter || statusFilter
                  ? "Try resetting your search or filters to see more records."
                  : "No family records registered yet. Click 'Add Family' to register a household."}
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Card List (Visible on phones/small screens) */}
              <div className="md:hidden divide-y divide-slate-100">
                {families.map((fam) => {
                  const isPhoneVisible = revealedPhones[fam.id];
                  return (
                    <div key={fam.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                              {fam.familyCode}
                            </span>
                            <Badge variant={fam.status === "active" ? "success" : "neutral"} size="sm">
                              {fam.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">
                            {fam.householdHeadName}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleShortlist(fam)}
                          title={fam.shortlisted ? "Remove from priority shortlist" : "Add to priority shortlist"}
                          className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <StarIcon
                            filled={fam.shortlisted}
                            className={`w-5 h-5 ${
                              fam.shortlisted ? "text-amber-500" : "text-slate-300"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Catchment & Facility / Stakeholders */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Catchment</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {fam.village?.name || "Village N/A"}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {fam.mandal?.name || "Mandal N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Facility / Doctor / ASHA</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {fam.facility?.name || "Facility N/A"}
                          </span>
                          {fam.doctor?.fullName && (
                            <span className="text-[10px] text-blue-700 block truncate font-medium">
                              Dr. {fam.doctor.fullName}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 block truncate">
                            {fam.ashas?.length > 0
                              ? `ASHA: ${fam.ashas.map((a) => a.fullName).join(", ")}`
                              : fam.asha?.fullName
                              ? `ASHA: ${fam.asha.fullName}`
                              : "No ASHA"}
                          </span>
                        </div>
                      </div>

                      {/* Phone & Drone Info */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div>
                          {fam.phoneNumber ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-slate-700">
                                {isPhoneVisible ? fam.phoneNumber : maskPhone(fam.phoneNumber)}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePhoneReveal(fam.id)}
                                className="text-[10px] text-emerald-700 font-sans font-medium underline"
                              >
                                {isPhoneVisible ? "Hide" : "Show"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No phone</span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            fam.receivedDroneService === "yes"
                              ? "bg-emerald-100 text-emerald-800"
                              : fam.receivedDroneService === "dont_know"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Drone: {fam.receivedDroneService === "yes" ? "Yes" : fam.receivedDroneService === "dont_know" ? "Don't know" : "No"}
                        </span>
                      </div>

                      {/* Characteristics */}
                      {fam.householdCharacteristics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {fam.householdCharacteristics.map((c) => (
                            <span
                              key={c}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                            >
                              {CHARACTERISTICS_LABELS[c] || c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons on mobile */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openFamilyDetails(fam)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs min-h-[34px]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(fam)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-emerald-700 font-semibold text-xs min-h-[34px] flex items-center gap-1"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(fam)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold min-h-[34px] ${
                            fam.status === "active"
                              ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/50"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/50"
                          }`}
                        >
                          {fam.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (Hidden on small screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Family Code & Head Name</th>
                      <th className="px-6 py-3 font-semibold">Hierarchy (Mandal / Village)</th>
                      <th className="px-6 py-3 font-semibold">Facility & ASHA</th>
                      <th className="px-6 py-3 font-semibold">Phone (Protected)</th>
                      <th className="px-6 py-3 font-semibold">Drone Service</th>
                      <th className="px-6 py-3 font-semibold">Priority</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {families.map((fam) => {
                      const isPhoneVisible = revealedPhones[fam.id];

                      return (
                        <tr key={fam.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-mono text-[11px] font-bold text-emerald-700">
                              {fam.familyCode}
                            </div>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {fam.householdHeadName}
                            </div>
                            {fam.householdCharacteristics?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fam.householdCharacteristics.map((c) => (
                                  <span
                                    key={c}
                                    className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600"
                                  >
                                    {CHARACTERISTICS_LABELS[c] || c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-medium text-slate-800">
                              {fam.village?.name || "Village N/A"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {fam.mandal?.name || "Mandal N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-medium text-slate-800">
                              {fam.facility?.name || "Facility N/A"}
                            </div>
                            {fam.doctor?.fullName && (
                              <div className="text-[11px] text-blue-700 font-medium">
                                Dr. {fam.doctor.fullName}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500">
                              {fam.ashas?.length > 0
                                ? `ASHA: ${fam.ashas.map((a) => a.fullName).join(", ")}`
                                : fam.asha?.fullName
                                ? `ASHA: ${fam.asha.fullName}`
                                : "No ASHA assigned"}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            {fam.phoneNumber ? (
                              <div className="space-y-0.5 font-mono text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span>{isPhoneVisible ? fam.phoneNumber : maskPhone(fam.phoneNumber)}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePhoneReveal(fam.id)}
                                    className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-sans"
                                  >
                                    {isPhoneVisible ? "Hide" : "Show"}
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 capitalize font-sans">
                                  ({fam.phoneOwner || "own"})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                fam.receivedDroneService === "yes"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : fam.receivedDroneService === "dont_know"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {fam.receivedDroneService === "yes"
                                ? "Received"
                                : fam.receivedDroneService === "dont_know"
                                ? "Don't know"
                                : "No"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              type="button"
                              onClick={() => toggleShortlist(fam)}
                              title={fam.shortlisted ? "Remove from priority shortlist" : "Add to priority shortlist"}
                              className="inline-flex items-center gap-1 group"
                            >
                              <StarIcon
                                filled={fam.shortlisted}
                                className={`w-4 h-4 transition-colors ${
                                  fam.shortlisted ? "text-amber-500" : "text-slate-300 group-hover:text-amber-400"
                                }`}
                              />
                              {fam.shortlisted && (
                                <span className="text-[10px] font-bold text-amber-700">Shortlisted</span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge variant={fam.status === "active" ? "success" : "neutral"} size="sm">
                              {fam.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openFamilyDetails(fam)}
                              className="text-slate-600 hover:text-slate-900 font-medium text-xs transition-colors"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(fam)}
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium text-xs transition-colors"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStatus(fam)}
                              className={`font-medium text-xs transition-colors ${
                                fam.status === "active"
                                  ? "text-rose-600 hover:text-rose-800"
                                  : "text-emerald-600 hover:text-emerald-800"
                              }`}
                            >
                              {fam.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Family Form Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 transition-all animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop click dismisser */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsFormOpen(false)}
            aria-hidden="true"
          />

          <div className="max-sm:h-[94dvh] max-sm:rounded-t-3xl max-sm:w-full sm:max-h-[88vh] sm:rounded-2xl max-w-3xl w-full flex flex-col bg-white shadow-2xl border border-slate-200 overflow-hidden relative">
            {/* Mobile Sheet Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header (Sticky at top of modal) */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 shrink-0">
                  <HomeIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {editingId ? "Edit Family Household" : "Register New Family"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {editingId
                      ? "Update catchment, head, & health characteristics"
                      : "Add household with automatic Family Code generation"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 transition-all shrink-0"
                aria-label="Close form"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Section Navigation Pills (Mobile-friendly jump bar) */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm px-4 py-2 sm:px-6 border-b border-slate-200/70 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 text-xs">
              <button
                type="button"
                onClick={() => scrollToSection("section-location")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap min-h-[32px] ${
                  activeSection === "section-location"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                A. Catchment
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("section-contact")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap min-h-[32px] ${
                  activeSection === "section-contact"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                B. Household Head
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("section-health")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap min-h-[32px] ${
                  activeSection === "section-health"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                C. Health Profile
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-6 overscroll-contain">
                {/* SECTION A: LOCATION & GEOGRAPHY */}
                <div id="section-location" className="space-y-3.5 scroll-mt-28">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                      A
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Location & Geographic Catchment
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1. Project *
                      </label>
                      <select
                        required
                        value={projectId}
                        onChange={(e) => handleFormProjectChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px] sm:min-h-[38px] transition-all"
                      >
                        <option value="" disabled>
                          Select Project
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        2. Mandal *
                      </label>
                      <select
                        required
                        value={mandalId}
                        onChange={(e) => handleFormMandalChange(e.target.value)}
                        disabled={!projectId || formMandals.length === 0}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px] sm:min-h-[38px] transition-all"
                      >
                        <option value="" disabled>
                          Select Mandal
                        </option>
                        {formMandals.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        3. PHC / Facility *
                      </label>
                      <select
                        required
                        value={facilityId}
                        onChange={(e) => handleFormFacilityChange(e.target.value)}
                        disabled={!mandalId || formFacilities.length === 0}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px] sm:min-h-[38px] transition-all"
                      >
                        <option value="" disabled>
                          Select Facility
                        </option>
                        {formFacilities.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.facilityType || "PHC"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        4. Village / Habitation *
                      </label>
                      <select
                        required
                        value={villageId}
                        onChange={(e) => setVillageId(e.target.value)}
                        disabled={!facilityId || formVillages.length === 0}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px] sm:min-h-[38px] transition-all"
                      >
                        <option value="" disabled>
                          {formVillages.length === 0 ? "No Villages in Catchment" : "Select Village"}
                        </option>
                        {formVillages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Doctor Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          5. Assigned Medical Officer / Doctor
                        </label>
                        <button
                          type="button"
                          onClick={openAddDoctorModal}
                          disabled={!mandalId}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                        >
                          <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Add Doctor</span>
                        </button>
                      </div>
                      <select
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        disabled={!mandalId}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px] sm:min-h-[38px] transition-all"
                      >
                        <option value="">None / Not Assigned</option>
                        {formDoctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            Dr. {d.fullName} {d.designation ? `(${d.designation})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Multiple ASHA Workers */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            6. Assigned ASHA Worker(s)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Add one or multiple ASHA workers for this village catchment
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openAddAshaModal}
                            disabled={!mandalId}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                          >
                            <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ New ASHA</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddAshaSlot}
                            disabled={!mandalId || formAshas.length === 0}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                          >
                            <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Add Slot</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {ashaIds.map((curAshaId, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={curAshaId}
                              onChange={(e) => handleAshaChange(idx, e.target.value)}
                              disabled={!mandalId}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px] sm:min-h-[38px] transition-all"
                            >
                              <option value="">
                                {formAshas.length === 0
                                  ? "No ASHAs in Catchment"
                                  : `Select ASHA Worker ${ashaIds.length > 1 ? `#${idx + 1}` : ""}`}
                              </option>
                              {formAshas.map((a) => (
                                <option
                                  key={a.id}
                                  value={a.id}
                                  disabled={ashaIds.includes(a.id) && a.id !== curAshaId}
                                >
                                  {a.fullName} {a.phone ? `(${a.phone})` : ""}
                                </option>
                              ))}
                            </select>
                            {ashaIds.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAshaSlot(idx)}
                                className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 shrink-0 min-h-[38px]"
                                title="Remove this ASHA slot"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION B: HOUSEHOLD INFORMATION */}
                <div id="section-contact" className="space-y-3.5 scroll-mt-28">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                      B
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Household Contact & Ownership
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        6. Household Head Name *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={householdHeadName}
                        onChange={(e) => setHouseholdHeadName(e.target.value)}
                        placeholder="e.g. Kondagorla Somulu"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px] sm:min-h-[38px] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        7. Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px] sm:min-h-[38px] transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        8. Whose Phone? *
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {["own", "relative", "neighbour", "asha"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setPhoneOwner(opt)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold capitalize border min-h-[42px] sm:min-h-[38px] transition-all flex items-center justify-center ${
                              phoneOwner === opt
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-500"
                                : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION C: CHARACTERISTICS & HEALTH ACCESS */}
                <div id="section-health" className="space-y-4 scroll-mt-28">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                      C
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Household Health Profile & Characteristics
                    </h4>
                  </div>

                  {/* 9. Characteristics Checkboxes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      9. Household Characteristics (Select all that apply)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                      {Object.entries(CHARACTERISTICS_LABELS).map(([key, label]) => {
                        const isSelected = householdCharacteristics.includes(key);
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all min-h-[44px] select-none active:scale-[0.99] ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-500/40 shadow-xs"
                                : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCharacteristic(key)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="leading-snug">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 10, 11, 12 Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        10. Visited PHC in last 3 months? *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "yes", label: "Yes" },
                          { val: "no", label: "No" },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setVisitedPHCLast3Months(item.val)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all min-h-[42px] sm:min-h-[38px] flex items-center justify-center ${
                              visitedPHCLast3Months === item.val
                                ? "border-emerald-500 bg-emerald-600 text-white shadow-xs"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        11. Agrees to Contact? *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "yes", label: "Yes" },
                          { val: "no", label: "No" },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setAgreesToContact(item.val)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all min-h-[42px] sm:min-h-[38px] flex items-center justify-center ${
                              agreesToContact === item.val
                                ? "border-emerald-500 bg-emerald-600 text-white shadow-xs"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        12. Travel Time to PHC *
                      </label>
                      <select
                        required
                        value={travelTimeToPHC}
                        onChange={(e) => setTravelTimeToPHC(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none min-h-[42px] sm:min-h-[38px]"
                      >
                        {Object.entries(TRAVEL_TIME_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 13. Reasons for repeated care */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      13. Why is the household likely to need care repeatedly? (Multi-select)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                      {Object.entries(CARE_REASONS_LABELS).map(([key, label]) => {
                        const isSelected = reasonsForRepeatedCare.includes(key);
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-xs cursor-pointer transition-all min-h-[44px] select-none active:scale-[0.99] ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-500/40 shadow-xs"
                                : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCareReason(key)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <span className="leading-snug">{label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {reasonsForRepeatedCare.includes("other") && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          maxLength={250}
                          value={otherCareReason}
                          onChange={(e) => setOtherCareReason(e.target.value)}
                          placeholder="Please specify other reason for recurring healthcare needs..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-slate-900 focus:border-emerald-500 focus:outline-none min-h-[44px] sm:min-h-[38px]"
                        />
                      </div>
                    )}
                  </div>

                  {/* 14, 15 Drone Service & Remarks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        14. Already received drone-delivered service? *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: "yes", label: "Yes" },
                          { val: "no", label: "No" },
                          { val: "dont_know", label: "Don't know" },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setReceivedDroneService(item.val)}
                            className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all min-h-[42px] sm:min-h-[38px] flex items-center justify-center text-center ${
                              receivedDroneService === item.val
                                ? "border-emerald-500 bg-emerald-600 text-white shadow-xs"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        15. ASHA Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={500}
                        value={ashaRemarks}
                        onChange={(e) => setAshaRemarks(e.target.value)}
                        placeholder="Notes on accessibility, chronic illness history, etc."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none min-h-[42px] sm:min-h-[38px]"
                      />
                    </div>
                  </div>

                  {/* 16. Shortlisted Checkbox */}
                  <div className="pt-1">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                        shortlisted
                          ? "border-amber-400 bg-amber-50/90 ring-1 ring-amber-400 shadow-xs"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={shortlisted}
                        onChange={(e) => setShortlisted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <StarIcon filled className="w-3.5 h-3.5 text-amber-500" />
                          <span>16. Priority Shortlist</span>
                        </div>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                          Mark this household for high-priority field visit and immediate follow-up.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0 shadow-lg sm:shadow-none">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] text-sm font-semibold justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] text-sm font-bold justify-center shadow-md shadow-emerald-700/20"
                >
                  {editingId ? "Update Family Record" : "Register Family"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Warning Confirmation Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 flex min-h-full items-center justify-center animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-amber-300 overflow-hidden my-auto">
            <div className="border-b border-amber-200 bg-amber-50 p-4 sm:p-6 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-amber-900">
                  Potential Duplicate Household Detected
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {duplicateWarning.message}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Matching Existing Households:
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                {duplicateWarning.matches?.map((m) => (
                  <div key={m.id} className="p-3 text-xs space-y-1 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-700">{m.familyCode}</span>
                      <span className="font-semibold text-slate-800 truncate ml-2">{m.householdHeadName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Village: {m.village?.name || "N/A"} &bull; Phone: {m.phoneNumber || "None"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Please verify if this is indeed a distinct family before confirming. Confirming will create the record with a unique Family Code.
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDuplicateWarning(null)}
                  className="w-full sm:w-auto min-h-[44px] justify-center"
                >
                  Cancel & Review
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setDuplicateWarning(null);
                    handleSubmit(null, true);
                  }}
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] justify-center font-bold"
                >
                  Confirm & Register Anyway
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Family Details Modal */}
      {viewingFamily && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 flex min-h-full items-end sm:items-center justify-center animate-fadeIn">
          <div className="max-sm:h-[90dvh] max-sm:rounded-t-3xl max-sm:w-full sm:max-h-[85vh] sm:rounded-2xl max-w-2xl w-full flex flex-col bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold text-xs sm:text-sm">
                  FAM
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {viewingFamily.familyCode}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Household: {viewingFamily.householdHeadName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFamily(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                aria-label="Close details"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 overscroll-contain">
              {/* Location Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Catchment Hierarchy
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Project</span>
                    <span className="font-semibold text-slate-800 break-words">{viewingFamily.project?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mandal</span>
                    <span className="font-semibold text-slate-800 break-words">{viewingFamily.mandal?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Facility</span>
                    <span className="font-semibold text-slate-800 break-words">{viewingFamily.facility?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Village</span>
                    <span className="font-semibold text-slate-800 break-words">{viewingFamily.village?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Household & Survey Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Head of Household</span>
                    <span className="text-sm font-bold text-slate-900">{viewingFamily.householdHeadName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {viewingFamily.phoneNumber || "Not provided"} ({viewingFamily.phoneOwner})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Assigned ASHA Worker(s)</span>
                    <div className="text-slate-800 font-medium">
                      {viewingFamily.ashas && viewingFamily.ashas.length > 0 ? (
                        <div className="space-y-1 mt-0.5">
                          {viewingFamily.ashas.map((a, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{a.fullName}</span>
                              {a.phone && <span className="text-slate-400 font-mono text-[11px]">({a.phone})</span>}
                            </div>
                          ))}
                        </div>
                      ) : viewingFamily.asha?.fullName ? (
                        <span>{viewingFamily.asha.fullName}</span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Assigned Doctor / Medical Officer</span>
                    <span className="text-slate-800 font-medium">
                      {viewingFamily.doctor?.fullName ? (
                        <span className="text-blue-700 font-semibold">
                          Dr. {viewingFamily.doctor.fullName}
                          {viewingFamily.doctor.designation ? ` (${viewingFamily.doctor.designation})` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Agrees to Contact?</span>
                    <span className="font-semibold capitalize text-slate-800">{viewingFamily.agreesToContact}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Travel Time to PHC</span>
                    <span className="text-slate-800 font-semibold">
                      {TRAVEL_TIME_LABELS[viewingFamily.travelTimeToPHC] || viewingFamily.travelTimeToPHC}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Visited PHC Last 3 Months?</span>
                    <span className="font-semibold capitalize text-slate-800">{viewingFamily.visitedPHCLast3Months}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Drone Service Delivered?</span>
                    <span className="font-semibold capitalize text-slate-800">{viewingFamily.receivedDroneService}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Shortlist Status</span>
                    <span className="font-semibold text-slate-800">
                      {viewingFamily.shortlisted ? "★ Priority Shortlisted" : "Standard"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Characteristics & Care Needs */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Household Characteristics</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewingFamily.householdCharacteristics?.length > 0 ? (
                      viewingFamily.householdCharacteristics.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                          {CHARACTERISTICS_LABELS[c] || c}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 block text-[10px]">Reasons for Repeated Healthcare</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewingFamily.reasonsForRepeatedCare?.length > 0 ? (
                      viewingFamily.reasonsForRepeatedCare.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[11px]">
                          {CARE_REASONS_LABELS[r] || r}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None specified</span>
                    )}
                  </div>
                  {viewingFamily.otherCareReason && (
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      &quot;{viewingFamily.otherCareReason}&quot;
                    </p>
                  )}
                </div>

                {viewingFamily.ashaRemarks && (
                  <div className="pt-2">
                    <span className="text-slate-400 block text-[10px]">ASHA Remarks</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      {viewingFamily.ashaRemarks}
                    </p>
                  </div>
                )}
              </div>
              {/* Linked Doctor Interviews */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🩺 Linked Doctor Interviews</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-semibold">
                      {familyDoctorInterviews.length}
                    </span>
                  </span>
                </div>
                {loadingInterviews ? (
                  <div className="py-3 text-center text-xs text-slate-400 italic">
                    Loading linked doctor interviews...
                  </div>
                ) : familyDoctorInterviews.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    No doctor interviews linked to this family yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {familyDoctorInterviews.map((iv) => (
                      <div key={iv.id} className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/40 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-900">{iv.interviewCode}</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {iv.status}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-700 font-medium">
                          Doctor: {iv.doctor?.fullName ? `Dr. ${iv.doctor.fullName}` : "Doctor"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Date: {iv.interviewDate ? new Date(iv.interviewDate).toLocaleDateString() : "N/A"}
                          {iv.facility?.name ? ` • Facility: ${iv.facility.name}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 backdrop-blur-sm p-3 sm:p-4 flex justify-end shrink-0">
              <Button type="button" variant="outline" onClick={() => setViewingFamily(null)} className="w-full sm:w-auto min-h-[44px] justify-center">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Add Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={isAddStakeholderOpen}
        onClose={() => setIsAddStakeholderOpen(false)}
        defaultValues={{
          projectId,
          mandalId,
          facilityId,
          villageId,
          stakeholderType: stakeholderModalType,
          designation: stakeholderModalType === "doctor" ? "Medical Officer" : "ASHA Worker",
        }}
        lockGeography={true}
        onStakeholderCreated={(newStakeholder) => {
          if (stakeholderModalType === "doctor") {
            setAllDoctors((prev) => {
              const exists = prev.some((item) => item.id === newStakeholder.id);
              if (exists) return prev;
              return [...prev, newStakeholder];
            });
            setDoctorId(newStakeholder.id);
            setActionMessage(`Doctor "${newStakeholder.fullName}" created and selected.`);
          } else {
            setAllAshas((prev) => {
              const exists = prev.some((item) => item.id === newStakeholder.id);
              if (exists) return prev;
              return [...prev, newStakeholder];
            });
            setAshaIds((prev) => {
              const clean = prev.filter(Boolean);
              if (clean.includes(newStakeholder.id)) return prev;
              return [...clean, newStakeholder.id];
            });
            setActionMessage(`ASHA Worker "${newStakeholder.fullName}" created and selected.`);
          }
        }}
      />
    </div>
  );
}
