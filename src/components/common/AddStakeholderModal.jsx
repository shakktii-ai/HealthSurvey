"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { UsersIcon, AlertCircleIcon, CheckCircleIcon, PlusIcon } from "@/components/common/Icons";

const TYPE_CONFIG = {
  asha: {
    label: "ASHA Worker",
    defaultDesignation: "ASHA Worker",
    suggestions: ["ASHA Worker", "ASHA Facilitator", "Community Health Volunteer"],
  },
  doctor: {
    label: "Doctor / Medical Officer",
    defaultDesignation: "Medical Officer",
    suggestions: ["Medical Officer", "PHC Doctor", "General Physician", "Civil Assistant Surgeon"],
  },
  facility_staff: {
    label: "Facility Staff / Nurse",
    defaultDesignation: "Staff Nurse",
    suggestions: ["Staff Nurse", "Auxiliary Nurse Midwife (ANM)", "Pharmacist", "Lab Technician"],
  },
  government_official: {
    label: "Government Official",
    defaultDesignation: "Mandal Development Officer",
    suggestions: ["Mandal Development Officer (MDO)", "Tahsildar", "Panchayat Secretary", "CDPO"],
  },
};

export default function AddStakeholderModal({
  isOpen,
  onClose,
  onStakeholderCreated,
  defaultValues = {},
  lockGeography = false,
}) {
  const [fullName, setFullName] = useState("");
  const [stakeholderType, setStakeholderType] = useState("asha");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [projectId, setProjectId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [villageId, setVillageId] = useState("");

  // Metadata dropdown options
  const [projects, setProjects] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [villages, setVillages] = useState([]);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingDuplicate, setExistingDuplicate] = useState(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName(defaultValues.fullName || "");
      const initialType = defaultValues.stakeholderType || "asha";
      setStakeholderType(initialType);
      setDesignation(defaultValues.designation || TYPE_CONFIG[initialType]?.defaultDesignation || "");
      setPhone(defaultValues.phone || "");
      setProjectId(defaultValues.projectId || "");
      setMandalId(defaultValues.mandalId || "");
      setFacilityId(defaultValues.facilityId || "");
      setVillageId(defaultValues.villageId || "");
      setError("");
      setExistingDuplicate(null);

      // Fetch metadata
      fetchMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues]);

  async function fetchMetadata() {
    try {
      const [projRes, manRes, facRes, vilRes] = await Promise.all([
        fetch("/api/admin/projects?status=active&limit=100"),
        fetch("/api/admin/mandals?status=active&limit=200"),
        fetch("/api/admin/facilities?status=active&limit=300"),
        fetch("/api/admin/villages?status=active&limit=500"),
      ]);

      const [projData, manData, facData, vilData] = await Promise.all([
        projRes.json(),
        manRes.json(),
        facRes.json(),
        vilRes.json(),
      ]);

      if (projRes.ok && projData.success) setProjects(projData.items || []);
      if (manRes.ok && manData.success) setMandals(manData.items || []);
      if (facRes.ok && facData.success) setFacilities(facData.items || []);
      if (vilRes.ok && vilData.success) setVillages(vilData.items || []);
    } catch (err) {
      console.error("Failed to load metadata in AddStakeholderModal:", err);
    }
  }

  // Filter mandals, facilities, villages based on selections
  const filteredMandals = mandals.filter((m) => !projectId || m.projectId === projectId || m.project?._id === projectId || m.project?.id === projectId);
  const filteredFacilities = facilities.filter((f) => !mandalId || f.mandalId === mandalId || f.mandal?._id === mandalId || f.mandal?.id === mandalId);
  const filteredVillages = villages.filter((v) => !mandalId || v.mandalId === mandalId || v.mandal?._id === mandalId || v.mandal?.id === mandalId);

  const handleTypeChange = (newType) => {
    setStakeholderType(newType);
    if (!designation || Object.values(TYPE_CONFIG).some((c) => c.defaultDesignation === designation || c.suggestions.includes(designation))) {
      setDesignation(TYPE_CONFIG[newType]?.defaultDesignation || "");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Stakeholder name is required.");
      return;
    }
    if (!projectId) {
      setError("Please select the associated project.");
      return;
    }
    if (!mandalId) {
      setError("Please select the associated mandal.");
      return;
    }

    if (phone.trim() && !/^\d{10}$/.test(phone.trim().replace(/\D/g, ""))) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setExistingDuplicate(null);

      const payload = {
        fullName: fullName.trim(),
        stakeholderType,
        designation: designation.trim(),
        phone: phone.trim().replace(/\D/g, ""),
        projectId,
        mandalId,
        facilityId: facilityId || null,
        villageId: villageId || null,
      };

      const res = await fetch("/api/admin/stakeholders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error || "A stakeholder with this name or contact number already exists.");
        if (data.item) {
          setExistingDuplicate(data.item);
        }
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create stakeholder");
      }

      // Success
      if (typeof onStakeholderCreated === "function") {
        onStakeholderCreated(data.item);
      }
      onClose();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUseExisting() {
    if (existingDuplicate && typeof onStakeholderCreated === "function") {
      onStakeholderCreated(existingDuplicate);
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Stakeholder"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Subheader Information */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs">
            <UsersIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="leading-relaxed">
              Register a new stakeholder to link immediately to your family interview workflow without navigating away.
            </div>
          </div>

          {/* Error / Duplicate Warning Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
              {existingDuplicate && (
                <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-rose-700">
                    Existing Record: <strong>{existingDuplicate.fullName}</strong> ({existingDuplicate.designation || existingDuplicate.stakeholderType})
                  </span>
                  <button
                    type="button"
                    onClick={handleUseExisting}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100/60 border border-rose-300 text-rose-900 rounded-lg text-xs font-bold transition-colors"
                  >
                    Select This Stakeholder →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1. Stakeholder Type & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stakeholder Cadre / Type *
              </label>
              <select
                required
                value={stakeholderType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="asha">ASHA Worker (Accredited Social Health Activist)</option>
                <option value="doctor">Doctor / Medical Officer</option>
                <option value="facility_staff">Facility Staff / Nurse / ANM</option>
                <option value="government_official">Government Administrative Official</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Smt. K. Lakshmi Devi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* 2. Designation & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation / Title
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. ASHA Facilitator / Medical Officer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[10px] text-slate-400">Quick:</span>
                {TYPE_CONFIG[stakeholderType]?.suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDesignation(sug)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      designation === sug
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Standard 10-digit mobile number for survey coordination.
              </span>
            </div>
          </div>

          {/* 3. Catchment / Geographic Hierarchy */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Geographic Catchment & Linkage
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associated Project *
                </label>
                {lockGeography && projectId ? (
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                    {projects.find((p) => p.id === projectId)?.name || "Current Project"}
                  </div>
                ) : (
                  <select
                    required
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      setMandalId("");
                      setFacilityId("");
                      setVillageId("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden"
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
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associated Mandal *
                </label>
                {lockGeography && mandalId ? (
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                    {mandals.find((m) => m.id === mandalId)?.name || "Current Mandal"}
                  </div>
                ) : (
                  <select
                    required
                    value={mandalId}
                    onChange={(e) => {
                      setMandalId(e.target.value);
                      setFacilityId("");
                      setVillageId("");
                    }}
                    disabled={!projectId}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="" disabled>
                      Select Mandal
                    </option>
                    {filteredMandals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PHC / Healthcare Facility {stakeholderType === "doctor" || stakeholderType === "facility_staff" ? "*" : "(Optional)"}
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={!mandalId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">None / Not Specific</option>
                  {filteredFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facilityType || "PHC"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Habitation {stakeholderType === "asha" ? "(Recommended)" : "(Optional)"}
                </label>
                <select
                  value={villageId}
                  onChange={(e) => setVillageId(e.target.value)}
                  disabled={!mandalId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">None / Mandal Level</option>
                  {filteredVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlusIcon className="w-4 h-4" />
            )}
            <span>Save & Link Stakeholder</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
