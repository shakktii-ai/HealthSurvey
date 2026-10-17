import connectToDatabase from "@/lib/mongodb";
import Family from "@/models/Family";
import Project from "@/models/Project";
import Mandal from "@/models/Mandal";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import Stakeholder from "@/models/Stakeholder";
import Counter from "@/models/Counter";
import { logAudit } from "@/lib/audit";

/**
 * Extracts a 2-character prefix from Mandal for human-readable codes (e.g. "AN", "AR", "CH").
 */
function getMandalShortCode(mandal) {
  if (!mandal) return "MN";
  const source = (mandal.code || mandal.name || "").replace(/^MAN-/, "").replace(/[^A-Z0-9]/g, "");
  return (source.slice(0, 2) || "MN").toUpperCase();
}

/**
 * Generates an atomic, collision-free Family Code.
 * Format: FAM-{MANDAL_PREFIX}-{5_DIGITS} (e.g. FAM-AN-00001)
 */
async function generateFamilyCode(mandal) {
  const prefix = getMandalShortCode(mandal);
  const sequenceName = `family_${prefix}`;
  const seq = await Counter.getNextSequence(sequenceName);
  return `FAM-${prefix}-${seq.toString().padStart(5, "0")}`;
}

/**
 * List registered families with pagination, search, and hierarchy filtering.
 */
export async function listFamilies({
  projectId = "",
  mandalId = "",
  facilityId = "",
  villageId = "",
  ashaId = "",
  shortlisted = "",
  status = "",
  search = "",
  page = 1,
  limit = 15,
  isSuperadmin = true,
} = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.project = projectId;
  if (mandalId) query.mandal = mandalId;
  if (facilityId) query.facility = facilityId;
  if (villageId) query.village = villageId;
  if (ashaId) query.asha = ashaId;

  if (shortlisted === "true" || shortlisted === true) query.shortlisted = true;
  if (shortlisted === "false" || shortlisted === false) query.shortlisted = false;

  if (status) query.status = status;

  if (search) {
    const term = search.trim();
    const regex = new RegExp(term, "i");
    const normalizedTerm = Family.normalizePhone(term);

    const orConditions = [
      { familyCode: regex },
      { householdHeadName: regex },
    ];
    if (normalizedTerm) {
      orConditions.push({ normalizedPhone: new RegExp(normalizedTerm) });
    }
    query.$or = orConditions;
  }

  const numericLimit = Math.max(1, Math.min(100, Number(limit) || 15));
  const numericPage = Math.max(1, Number(page) || 1);
  const skip = (numericPage - 1) * numericLimit;

  const [total, families] = await Promise.all([
    Family.countDocuments(query),
    Family.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate("project", "name code")
      .populate("mandal", "name code")
      .populate("facility", "name code facilityType")
      .populate("village", "name code")
      .populate("asha", "fullName designation")
      .populate("createdBy", "name email"),
  ]);

  return {
    items: families.map((f) => f.toSafeObject({ isSuperadmin })),
    total,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(total / numericLimit) || 1,
  };
}

/**
 * Get single family details by ID.
 */
export async function getFamilyById(id, { isSuperadmin = true } = {}) {
  await connectToDatabase();
  const family = await Family.findById(id)
    .populate("project", "name code")
    .populate("mandal", "name code")
    .populate("facility", "name code facilityType serviceCategory")
    .populate("village", "name code")
    .populate("asha", "fullName designation phone")
    .populate("createdBy", "name email");

  return family ? family.toSafeObject({ isSuperadmin }) : null;
}

/**
 * Validate that Project -> Mandal -> Facility -> Village -> ASHA form a valid, active hierarchy.
 */
async function validateHierarchy({ projectId, mandalId, facilityId, villageId, ashaId }) {
  const [project, mandal, facility, village] = await Promise.all([
    Project.findById(projectId),
    Mandal.findById(mandalId),
    Facility.findById(facilityId),
    Village.findById(villageId),
  ]);

  if (!project || project.status !== "active") {
    return { valid: false, error: "Associated project is invalid or inactive", status: 400 };
  }
  if (!mandal || mandal.status !== "active") {
    return { valid: false, error: "Associated mandal is invalid or inactive", status: 400 };
  }
  if (mandal.projectId.toString() !== projectId) {
    return { valid: false, error: "Selected mandal does not belong to the selected project", status: 400 };
  }

  if (!facility || facility.status !== "active") {
    return { valid: false, error: "Associated facility is invalid or inactive", status: 400 };
  }
  if (facility.mandalId.toString() !== mandalId) {
    return { valid: false, error: "Selected facility does not belong to the selected mandal", status: 400 };
  }

  if (!village || village.status !== "active") {
    return { valid: false, error: "Associated village is invalid or inactive", status: 400 };
  }
  if (village.mandalId.toString() !== mandalId) {
    return { valid: false, error: "Selected village does not belong to the selected mandal", status: 400 };
  }
  if (village.facilityId.toString() !== facilityId) {
    return { valid: false, error: "Selected village does not belong to the selected facility catchment", status: 400 };
  }

  let ashaRecord = null;
  if (ashaId) {
    ashaRecord = await Stakeholder.findById(ashaId);
    if (!ashaRecord || ashaRecord.status !== "active") {
      return { valid: false, error: "Associated ASHA is invalid or inactive", status: 400 };
    }
    if (ashaRecord.stakeholderType !== "asha") {
      return { valid: false, error: "Selected stakeholder is not an ASHA worker", status: 400 };
    }
    if (ashaRecord.mandalId.toString() !== mandalId) {
      return { valid: false, error: "Selected ASHA does not operate in the selected mandal", status: 400 };
    }
  }

  return { valid: true, project, mandal, facility, village, asha: ashaRecord };
}

/**
 * Registers a new family household with duplicate detection and atomic code generation.
 */
export async function createFamily(data, actor) {
  const {
    projectId,
    mandalId,
    facilityId,
    villageId,
    ashaId = null,
    householdHeadName,
    phoneNumber = "",
    phoneOwner = "own",
    householdCharacteristics = [],
    visitedPHCLast3Months,
    agreesToContact,
    travelTimeToPHC,
    reasonsForRepeatedCare = [],
    otherCareReason = "",
    receivedDroneService,
    ashaRemarks = "",
    shortlisted = false,
    confirmDuplicate = false,
  } = data;

  // 1. Basic required validation
  if (!projectId || !mandalId || !facilityId || !villageId) {
    return { success: false, error: "Project, Mandal, Facility, and Village are all required", status: 400 };
  }
  if (!householdHeadName || !householdHeadName.trim()) {
    return { success: false, error: "Household Head Name is required", status: 400 };
  }
  if (!visitedPHCLast3Months || !["yes", "no"].includes(visitedPHCLast3Months)) {
    return { success: false, error: "Visited PHC in last 3 months must be 'yes' or 'no'", status: 400 };
  }
  if (!agreesToContact || !["yes", "no"].includes(agreesToContact)) {
    return { success: false, error: "Agrees to contact must be 'yes' or 'no'", status: 400 };
  }
  if (!travelTimeToPHC) {
    return { success: false, error: "Travel time to PHC is required", status: 400 };
  }
  if (!receivedDroneService || !["yes", "no", "dont_know"].includes(receivedDroneService)) {
    return { success: false, error: "Received drone service must be 'yes', 'no', or 'dont_know'", status: 400 };
  }

  await connectToDatabase();

  // 2. Strict Geographic Hierarchy Validation
  const hierarchyResult = await validateHierarchy({ projectId, mandalId, facilityId, villageId, ashaId });
  if (!hierarchyResult.valid) {
    return { success: false, error: hierarchyResult.error, status: hierarchyResult.status };
  }

  const normalizedPhone = Family.normalizePhone(phoneNumber);

  // 3. Duplicate Detection Check (unless confirmed by Superadmin)
  if (!confirmDuplicate) {
    const duplicateConditions = [];
    if (normalizedPhone && normalizedPhone.length >= 7) {
      duplicateConditions.push({ project: projectId, normalizedPhone });
    }
    if (householdHeadName && villageId) {
      duplicateConditions.push({
        village: villageId,
        householdHeadName: new RegExp(`^${householdHeadName.trim()}$`, "i"),
      });
    }

    if (duplicateConditions.length > 0) {
      const potentialMatches = await Family.find({
        $or: duplicateConditions,
        status: "active",
      })
        .limit(5)
        .populate("project", "name code")
        .populate("mandal", "name code")
        .populate("facility", "name code")
        .populate("village", "name code");

      if (potentialMatches.length > 0) {
        return {
          success: false,
          potentialDuplicate: true,
          matches: potentialMatches.map((m) => m.toSafeObject({ isSuperadmin: true })),
          error: `Potential duplicate household detected (${potentialMatches.length} existing record found with matching phone or head of household in this village). Review and confirm to proceed.`,
          status: 409,
        };
      }
    }
  }

  // 4. Atomic Code Generation with collision safety
  let familyCode = "";
  let family = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (!family && attempts < maxAttempts) {
    attempts++;
    familyCode = await generateFamilyCode(hierarchyResult.mandal);

    try {
      family = await Family.create({
        familyCode,
        project: projectId,
        mandal: mandalId,
        facility: facilityId,
        village: villageId,
        asha: ashaId || null,
        householdHeadName: householdHeadName.trim(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : "",
        normalizedPhone,
        phoneOwner: phoneOwner || "own",
        householdCharacteristics: Array.isArray(householdCharacteristics) ? householdCharacteristics : [],
        visitedPHCLast3Months,
        agreesToContact,
        travelTimeToPHC,
        reasonsForRepeatedCare: Array.isArray(reasonsForRepeatedCare) ? reasonsForRepeatedCare : [],
        otherCareReason: otherCareReason ? otherCareReason.trim() : "",
        receivedDroneService,
        ashaRemarks: ashaRemarks ? ashaRemarks.trim() : "",
        shortlisted: Boolean(shortlisted),
        status: "active",
        createdBy: actor.id || actor._id,
      });
    } catch (err) {
      // Check for code collision on duplicate key (11000)
      if (err.code === 11000 && err.keyPattern?.familyCode) {
        family = null; // Retry next sequence
      } else {
        throw err;
      }
    }
  }

  if (!family) {
    return { success: false, error: "Failed to generate a unique family code after multiple attempts", status: 500 };
  }

  // 5. Populate and Audit Log
  await family.populate([
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "facility", select: "name code facilityType" },
    { path: "village", select: "name code" },
    { path: "asha", select: "fullName designation" },
    { path: "createdBy", select: "name email" },
  ]);

  await logAudit({
    actor,
    entityType: "Family",
    entityId: family._id,
    action: "CREATE",
    after: family,
  });

  return { success: true, item: family.toSafeObject({ isSuperadmin: true }), status: 201 };
}

/**
 * Updates an existing family record while preventing arbitrary modification of familyCode or createdBy.
 */
export async function updateFamily(id, updates, actor) {
  await connectToDatabase();
  const family = await Family.findById(id);
  if (!family) {
    return { success: false, error: "Family record not found", status: 404 };
  }

  const before = family.toObject();

  // Validate hierarchy if any geographic field changed
  const projectId = updates.projectId || family.project.toString();
  const mandalId = updates.mandalId || family.mandal.toString();
  const facilityId = updates.facilityId || family.facility.toString();
  const villageId = updates.villageId || family.village.toString();
  const ashaId = updates.ashaId !== undefined ? updates.ashaId : family.asha?.toString();

  const isGeoChanged =
    projectId !== family.project.toString() ||
    mandalId !== family.mandal.toString() ||
    facilityId !== family.facility.toString() ||
    villageId !== family.village.toString() ||
    ashaId !== (family.asha ? family.asha.toString() : null);

  if (isGeoChanged) {
    const hierarchyResult = await validateHierarchy({ projectId, mandalId, facilityId, villageId, ashaId });
    if (!hierarchyResult.valid) {
      return { success: false, error: hierarchyResult.error, status: hierarchyResult.status };
    }
    family.project = projectId;
    family.mandal = mandalId;
    family.facility = facilityId;
    family.village = villageId;
    family.asha = ashaId || null;
  }

  // Update demographic & survey fields
  if (updates.householdHeadName) family.householdHeadName = updates.householdHeadName.trim();
  if (updates.phoneNumber !== undefined) {
    family.phoneNumber = updates.phoneNumber.trim();
    family.normalizedPhone = Family.normalizePhone(family.phoneNumber);
  }
  if (updates.phoneOwner) family.phoneOwner = updates.phoneOwner;
  if (updates.householdCharacteristics) family.householdCharacteristics = updates.householdCharacteristics;
  if (updates.visitedPHCLast3Months) family.visitedPHCLast3Months = updates.visitedPHCLast3Months;
  if (updates.agreesToContact) family.agreesToContact = updates.agreesToContact;
  if (updates.travelTimeToPHC) family.travelTimeToPHC = updates.travelTimeToPHC;
  if (updates.reasonsForRepeatedCare) family.reasonsForRepeatedCare = updates.reasonsForRepeatedCare;
  if (updates.otherCareReason !== undefined) family.otherCareReason = updates.otherCareReason.trim();
  if (updates.receivedDroneService) family.receivedDroneService = updates.receivedDroneService;
  if (updates.ashaRemarks !== undefined) family.ashaRemarks = updates.ashaRemarks.trim();
  if (updates.shortlisted !== undefined) family.shortlisted = Boolean(updates.shortlisted);
  if (updates.status && ["active", "inactive"].includes(updates.status)) family.status = updates.status;

  await family.save();

  await family.populate([
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "facility", select: "name code facilityType" },
    { path: "village", select: "name code" },
    { path: "asha", select: "fullName designation" },
    { path: "createdBy", select: "name email" },
  ]);

  await logAudit({
    actor,
    entityType: "Family",
    entityId: family._id,
    action: updates.status && updates.status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: family,
  });

  return { success: true, item: family.toSafeObject({ isSuperadmin: true }), status: 200 };
}

/**
 * Toggles a family record's status (active / inactive) or shortlist status.
 */
export async function toggleFamilyStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const family = await Family.findById(id);
  if (!family) {
    return { success: false, error: "Family record not found", status: 404 };
  }

  const before = family.toObject();
  family.status = status;
  await family.save();

  await logAudit({
    actor,
    entityType: "Family",
    entityId: family._id,
    action: "STATUS_CHANGE",
    before,
    after: family,
  });

  return { success: true, item: family.toSafeObject({ isSuperadmin: true }), status: 200 };
}

/**
 * Returns summary counts of families for dashboard display.
 */
export async function getFamilyStats(projectId = null) {
  await connectToDatabase();
  const query = {};
  if (projectId) query.project = projectId;

  const [total, active, inactive, shortlisted] = await Promise.all([
    Family.countDocuments(query),
    Family.countDocuments({ ...query, status: "active" }),
    Family.countDocuments({ ...query, status: "inactive" }),
    Family.countDocuments({ ...query, shortlisted: true }),
  ]);

  return { total, active, inactive, shortlisted };
}
