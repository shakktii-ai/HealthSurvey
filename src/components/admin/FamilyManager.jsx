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
} from "@/components/common/Icons";

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
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [projectId, setProjectId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [ashaId, setAshaId] = useState("");
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
      const [projRes, manRes, facRes, vilRes, ashaRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/mandals?status=active&limit=200"),
        fetch("/api/admin/facilities?status=active&limit=300"),
        fetch("/api/admin/villages?status=active&limit=500"),
        fetch("/api/admin/stakeholders?stakeholderType=asha&status=active&limit=300"),
      ]);

      const [projData, manData, facData, vilData, ashaData] = await Promise.all([
        projRes.json(),
        manRes.json(),
        facRes.json(),
        vilRes.json(),
        ashaRes.json(),
      ]);

      if (projRes.ok && projData.success) setProjects(projData.items || []);
      if (manRes.ok && manData.success) setAllMandals(manData.items || []);
      if (facRes.ok && facData.success) setAllFacilities(facData.items || []);
      if (vilRes.ok && vilData.success) setAllVillages(vilData.items || []);
      if (ashaRes.ok && ashaData.success) setAllAshas(ashaData.items || []);
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

    setProjectId(family.projectId || family.project?.id || "");
    setMandalId(family.mandalId || family.mandal?.id || "");
    setFacilityId(family.facilityId || family.facility?.id || "");
    setVillageId(family.villageId || family.village?.id || "");
    setAshaId(family.ashaId || family.asha?.id || "");

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
      const payload = {
        projectId,
        mandalId,
        facilityId,
        villageId,
        ashaId: ashaId || null,
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
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Family Code (FAM-...), household head, or phone number..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <Button onClick={openCreateForm} variant="primary" className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>Add Family</span>
            </Button>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setMandalFilter("");
                  setFacilityFilter("");
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Mandal</label>
              <select
                value={mandalFilter}
                onChange={(e) => {
                  setMandalFilter(e.target.value);
                  setFacilityFilter("");
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Facility</label>
              <select
                value={facilityFilter}
                onChange={(e) => {
                  setFacilityFilter(e.target.value);
                  setVillageFilter("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Village</label>
              <select
                value={villageFilter}
                onChange={(e) => {
                  setVillageFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Shortlist</label>
              <select
                value={shortlistFilter}
                onChange={(e) => {
                  setShortlistFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Families</option>
                <option value="true">Shortlisted Only</option>
                <option value="false">Not Shortlisted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
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
            <div className="overflow-x-auto">
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
                          <div className="text-[11px] text-slate-500">
                            ASHA: {fam.asha?.fullName || "None assigned"}
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
                            onClick={() => setViewingFamily(fam)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Family Household" : "Register New Family Household"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingId
                    ? "Update household information, characteristics, and survey preferences"
                    : "Register family in the catchment hierarchy with atomic Family Code generation"}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6">
              {/* SECTION A: LOCATION & GEOGRAPHY */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                    A
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Location & Geographic Catchment
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1. Project *
                    </label>
                    <select
                      required
                      value={projectId}
                      onChange={(e) => handleFormProjectChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      3. PHC / Facility *
                    </label>
                    <select
                      required
                      value={facilityId}
                      onChange={(e) => handleFormFacilityChange(e.target.value)}
                      disabled={!mandalId || formFacilities.length === 0}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      5. Assigned ASHA Worker
                    </label>
                    <select
                      value={ashaId}
                      onChange={(e) => setAshaId(e.target.value)}
                      disabled={!mandalId}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">None / Not Assigned</option>
                      {formAshas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION B: HOUSEHOLD INFORMATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                    B
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Household Contact & Ownership
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      7. Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      8. Whose Phone? *
                    </label>
                    <select
                      value={phoneOwner}
                      onChange={(e) => setPhoneOwner(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="own">Own</option>
                      <option value="relative">Relative</option>
                      <option value="neighbour">Neighbour</option>
                      <option value="asha">ASHA</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION C: CHARACTERISTICS & HEALTH ACCESS */}
              <div className="space-y-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(CHARACTERISTICS_LABELS).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          householdCharacteristics.includes(key)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={householdCharacteristics.includes(key)}
                          onChange={() => toggleCharacteristic(key)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 10, 11, 12 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      10. Visited PHC in last 3 months? *
                    </label>
                    <select
                      required
                      value={visitedPHCLast3Months}
                      onChange={(e) => setVisitedPHCLast3Months(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      11. Agrees to Contact? *
                    </label>
                    <select
                      required
                      value={agreesToContact}
                      onChange={(e) => setAgreesToContact(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      12. Travel Time to PHC *
                    </label>
                    <select
                      required
                      value={travelTimeToPHC}
                      onChange={(e) => setTravelTimeToPHC(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(CARE_REASONS_LABELS).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          reasonsForRepeatedCare.includes(key)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={reasonsForRepeatedCare.includes(key)}
                          onChange={() => toggleCareReason(key)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  {reasonsForRepeatedCare.includes("other") && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        maxLength={250}
                        value={otherCareReason}
                        onChange={(e) => setOtherCareReason(e.target.value)}
                        placeholder="Please specify other reason for recurring healthcare needs..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 14, 15, 16 Drone Service & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      14. Already received drone-delivered service? *
                    </label>
                    <select
                      required
                      value={receivedDroneService}
                      onChange={(e) => setReceivedDroneService(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="dont_know">Don&apos;t know</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      15. ASHA Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={ashaRemarks}
                      onChange={(e) => setAshaRemarks(e.target.value)}
                      placeholder="Notes on accessibility, chronic illness history, etc."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 16. Shortlisted Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shortlisted}
                      onChange={(e) => setShortlisted(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        16. Priority Shortlist
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Mark this household for high-priority field visit and immediate follow-up.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {editingId ? "Update Family" : "Register Family"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Warning Confirmation Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-amber-300 overflow-hidden">
            <div className="border-b border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-900">
                  Potential Duplicate Household Detected
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {duplicateWarning.message}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Matching Existing Households:
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                {duplicateWarning.matches?.map((m) => (
                  <div key={m.id} className="p-3 text-xs space-y-1 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-700">{m.familyCode}</span>
                      <span className="font-semibold text-slate-800">{m.householdHeadName}</span>
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

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDuplicateWarning(null)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold">
                  FAM
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewingFamily.familyCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Household: {viewingFamily.householdHeadName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingFamily(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Location Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Catchment Hierarchy
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Project</span>
                    <span className="font-semibold text-slate-800">{viewingFamily.project?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mandal</span>
                    <span className="font-semibold text-slate-800">{viewingFamily.mandal?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Facility</span>
                    <span className="font-semibold text-slate-800">{viewingFamily.facility?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Village</span>
                    <span className="font-semibold text-slate-800">{viewingFamily.village?.name || "N/A"}</span>
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
                    <span className="text-slate-400 block text-[10px]">Assigned ASHA</span>
                    <span className="text-slate-800 font-medium">
                      {viewingFamily.asha?.fullName || "None assigned"}
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

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setViewingFamily(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
