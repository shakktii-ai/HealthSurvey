import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/Project";
import Mandal from "@/models/Mandal";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import Stakeholder from "@/models/Stakeholder";
import { logAudit } from "@/lib/audit";

/* =========================================================================
   PROJECT SERVICE
   ========================================================================= */

export async function listProjects({ search = "", status = "", page = 1, limit = 50 } = {}) {
  await connectToDatabase();
  const query = {};

  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { code: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, projects] = await Promise.all([
    Project.countDocuments(query),
    Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("createdBy", "name email"),
  ]);

  return {
    items: projects.map((p) => p.toSafeObject()),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getProjectById(id) {
  await connectToDatabase();
  const project = await Project.findById(id).populate("createdBy", "name email");
  return project ? project.toSafeObject() : null;
}

export async function createProject({ name, code, description, startDate, endDate }, actor) {
  if (!name || !code || !startDate) {
    return { success: false, error: "Name, code, and start date are required", status: 400 };
  }

  const normalizedCode = code.trim().toUpperCase();
  await connectToDatabase();

  const existing = await Project.findOne({ code: normalizedCode });
  if (existing) {
    return { success: false, error: `Project code '${normalizedCode}' already exists`, status: 409 };
  }

  const project = await Project.create({
    name: name.trim(),
    code: normalizedCode,
    description: description ? description.trim() : "",
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    status: "active",
    createdBy: actor.id || actor._id,
  });

  await logAudit({
    actor,
    entityType: "Project",
    entityId: project._id,
    action: "CREATE",
    after: project,
  });

  return { success: true, item: project.toSafeObject(), status: 201 };
}

export async function updateProject(id, { name, description, startDate, endDate, status }, actor) {
  await connectToDatabase();
  const project = await Project.findById(id);
  if (!project) {
    return { success: false, error: "Project not found", status: 404 };
  }

  const before = project.toObject();

  if (name) project.name = name.trim();
  if (description !== undefined) project.description = description.trim();
  if (startDate) project.startDate = new Date(startDate);
  if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
  if (status && ["active", "inactive"].includes(status)) project.status = status;

  await project.save();

  await logAudit({
    actor,
    entityType: "Project",
    entityId: project._id,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: project,
  });

  return { success: true, item: project.toSafeObject(), status: 200 };
}

export async function toggleProjectStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const project = await Project.findById(id);
  if (!project) {
    return { success: false, error: "Project not found", status: 404 };
  }

  const before = project.toObject();
  project.status = status;
  await project.save();

  await logAudit({
    actor,
    entityType: "Project",
    entityId: project._id,
    action: "STATUS_CHANGE",
    before,
    after: project,
  });

  return { success: true, item: project.toSafeObject(), status: 200 };
}

/* =========================================================================
   MANDAL SERVICE
   ========================================================================= */

export async function listMandals({ projectId = "", search = "", status = "", page = 1, limit = 50 } = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.projectId = projectId;
  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { code: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, mandals] = await Promise.all([
    Mandal.countDocuments(query),
    Mandal.find(query).sort({ name: 1 }).skip(skip).limit(limit).populate("projectId", "name code status"),
  ]);

  return {
    items: mandals.map((m) => m.toSafeObject()),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getMandalById(id) {
  await connectToDatabase();
  const mandal = await Mandal.findById(id).populate("projectId", "name code status");
  return mandal ? mandal.toSafeObject() : null;
}

export async function createMandal({ name, code, projectId }, actor) {
  if (!name || !code || !projectId) {
    return { success: false, error: "Name, code, and project are required", status: 400 };
  }

  const normalizedCode = code.trim().toUpperCase();
  await connectToDatabase();

  const project = await Project.findById(projectId);
  if (!project) {
    return { success: false, error: "Associated project not found", status: 400 };
  }
  if (project.status !== "active") {
    return { success: false, error: "Cannot create a Mandal under an inactive project", status: 400 };
  }

  const existing = await Mandal.findOne({ code: normalizedCode });
  if (existing) {
    return { success: false, error: `Mandal code '${normalizedCode}' already exists`, status: 409 };
  }

  const mandal = await Mandal.create({
    name: name.trim().toUpperCase(),
    code: normalizedCode,
    projectId,
    status: "active",
  });

  await logAudit({
    actor,
    entityType: "Mandal",
    entityId: mandal._id,
    action: "CREATE",
    after: mandal,
  });

  return { success: true, item: mandal.toSafeObject(), status: 201 };
}

export async function updateMandal(id, { name, projectId, status }, actor) {
  await connectToDatabase();
  const mandal = await Mandal.findById(id);
  if (!mandal) {
    return { success: false, error: "Mandal not found", status: 404 };
  }

  if (projectId && projectId !== mandal.projectId.toString()) {
    const project = await Project.findById(projectId);
    if (!project || project.status !== "active") {
      return { success: false, error: "Target project is invalid or inactive", status: 400 };
    }
    mandal.projectId = projectId;
  }

  const before = mandal.toObject();
  if (name) mandal.name = name.trim().toUpperCase();
  if (status && ["active", "inactive"].includes(status)) mandal.status = status;

  await mandal.save();

  await logAudit({
    actor,
    entityType: "Mandal",
    entityId: mandal._id,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: mandal,
  });

  return { success: true, item: mandal.toSafeObject(), status: 200 };
}

export async function toggleMandalStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const mandal = await Mandal.findById(id);
  if (!mandal) {
    return { success: false, error: "Mandal not found", status: 404 };
  }

  const before = mandal.toObject();
  mandal.status = status;
  await mandal.save();

  await logAudit({
    actor,
    entityType: "Mandal",
    entityId: mandal._id,
    action: "STATUS_CHANGE",
    before,
    after: mandal,
  });

  return { success: true, item: mandal.toSafeObject(), status: 200 };
}

/* =========================================================================
   FACILITY / PHC SERVICE
   ========================================================================= */

export async function listFacilities({ projectId = "", mandalId = "", serviceCategory = "", search = "", status = "", page = 1, limit = 50 } = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.projectId = projectId;
  if (mandalId) query.mandalId = mandalId;
  if (serviceCategory) query.serviceCategory = serviceCategory;
  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { code: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, facilities] = await Promise.all([
    Facility.countDocuments(query),
    Facility.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate("projectId", "name code")
      .populate("mandalId", "name code"),
  ]);

  return {
    items: facilities.map((f) => f.toSafeObject()),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getFacilityById(id) {
  await connectToDatabase();
  const facility = await Facility.findById(id)
    .populate("projectId", "name code")
    .populate("mandalId", "name code");
  return facility ? facility.toSafeObject() : null;
}

export async function createFacility({ name, code, projectId, mandalId, facilityType = "PHC", serviceCategory = "Standard" }, actor) {
  if (!name || !code || !projectId || !mandalId) {
    return { success: false, error: "Name, code, project, and mandal are required", status: 400 };
  }

  const normalizedCode = code.trim().toUpperCase();
  await connectToDatabase();

  const [project, mandal] = await Promise.all([
    Project.findById(projectId),
    Mandal.findById(mandalId),
  ]);

  if (!project || project.status !== "active") {
    return { success: false, error: "Associated project is invalid or inactive", status: 400 };
  }
  if (!mandal || mandal.status !== "active") {
    return { success: false, error: "Associated mandal is invalid or inactive", status: 400 };
  }
  if (mandal.projectId.toString() !== projectId) {
    return { success: false, error: "Selected mandal does not belong to the selected project", status: 400 };
  }

  const existing = await Facility.findOne({ code: normalizedCode });
  if (existing) {
    return { success: false, error: `Facility code '${normalizedCode}' already exists`, status: 409 };
  }

  const facility = await Facility.create({
    name: name.trim(),
    code: normalizedCode,
    projectId,
    mandalId,
    facilityType,
    serviceCategory,
    status: "active",
  });

  await logAudit({
    actor,
    entityType: "Facility",
    entityId: facility._id,
    action: "CREATE",
    after: facility,
  });

  return { success: true, item: facility.toSafeObject(), status: 201 };
}

export async function updateFacility(id, { name, mandalId, facilityType, serviceCategory, status }, actor) {
  await connectToDatabase();
  const facility = await Facility.findById(id);
  if (!facility) {
    return { success: false, error: "Facility not found", status: 404 };
  }

  if (mandalId && mandalId !== facility.mandalId.toString()) {
    const mandal = await Mandal.findById(mandalId);
    if (!mandal || mandal.status !== "active") {
      return { success: false, error: "Target mandal is invalid or inactive", status: 400 };
    }
    if (mandal.projectId.toString() !== facility.projectId.toString()) {
      return { success: false, error: "Target mandal does not belong to the facility's project", status: 400 };
    }
    facility.mandalId = mandalId;
  }

  const before = facility.toObject();
  if (name) facility.name = name.trim();
  if (facilityType) facility.facilityType = facilityType;
  if (serviceCategory) facility.serviceCategory = serviceCategory;
  if (status && ["active", "inactive"].includes(status)) facility.status = status;

  await facility.save();

  await logAudit({
    actor,
    entityType: "Facility",
    entityId: facility._id,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: facility,
  });

  return { success: true, item: facility.toSafeObject(), status: 200 };
}

export async function toggleFacilityStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const facility = await Facility.findById(id);
  if (!facility) {
    return { success: false, error: "Facility not found", status: 404 };
  }

  const before = facility.toObject();
  facility.status = status;
  await facility.save();

  await logAudit({
    actor,
    entityType: "Facility",
    entityId: facility._id,
    action: "STATUS_CHANGE",
    before,
    after: facility,
  });

  return { success: true, item: facility.toSafeObject(), status: 200 };
}

/* =========================================================================
   VILLAGE SERVICE
   ========================================================================= */

export async function listVillages({ projectId = "", mandalId = "", facilityId = "", search = "", status = "", page = 1, limit = 50 } = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.projectId = projectId;
  if (mandalId) query.mandalId = mandalId;
  if (facilityId) query.facilityId = facilityId;
  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { code: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, villages] = await Promise.all([
    Village.countDocuments(query),
    Village.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate("projectId", "name code")
      .populate("mandalId", "name code")
      .populate("facilityId", "name code facilityType"),
  ]);

  return {
    items: villages.map((v) => v.toSafeObject()),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getVillageById(id) {
  await connectToDatabase();
  const village = await Village.findById(id)
    .populate("projectId", "name code")
    .populate("mandalId", "name code")
    .populate("facilityId", "name code facilityType");
  return village ? village.toSafeObject() : null;
}

export async function createVillage({ name, code, projectId, mandalId, facilityId }, actor) {
  if (!name || !code || !projectId || !mandalId || !facilityId) {
    return { success: false, error: "Name, code, project, mandal, and facility are required", status: 400 };
  }

  const normalizedCode = code.trim().toUpperCase();
  await connectToDatabase();

  const [project, mandal, facility] = await Promise.all([
    Project.findById(projectId),
    Mandal.findById(mandalId),
    Facility.findById(facilityId),
  ]);

  if (!project || project.status !== "active") {
    return { success: false, error: "Associated project is invalid or inactive", status: 400 };
  }
  if (!mandal || mandal.status !== "active") {
    return { success: false, error: "Associated mandal is invalid or inactive", status: 400 };
  }
  if (!facility || facility.status !== "active") {
    return { success: false, error: "Associated facility is invalid or inactive", status: 400 };
  }

  if (mandal.projectId.toString() !== projectId) {
    return { success: false, error: "Selected mandal does not belong to the selected project", status: 400 };
  }
  if (facility.mandalId.toString() !== mandalId) {
    return { success: false, error: "Selected facility does not belong to the selected mandal", status: 400 };
  }

  const existing = await Village.findOne({ code: normalizedCode });
  if (existing) {
    return { success: false, error: `Village code '${normalizedCode}' already exists`, status: 409 };
  }

  const village = await Village.create({
    name: name.trim(),
    code: normalizedCode,
    projectId,
    mandalId,
    facilityId,
    status: "active",
  });

  await logAudit({
    actor,
    entityType: "Village",
    entityId: village._id,
    action: "CREATE",
    after: village,
  });

  return { success: true, item: village.toSafeObject(), status: 201 };
}

export async function updateVillage(id, { name, facilityId, status }, actor) {
  await connectToDatabase();
  const village = await Village.findById(id);
  if (!village) {
    return { success: false, error: "Village not found", status: 404 };
  }

  if (facilityId && facilityId !== village.facilityId.toString()) {
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.status !== "active") {
      return { success: false, error: "Target facility is invalid or inactive", status: 400 };
    }
    if (facility.mandalId.toString() !== village.mandalId.toString()) {
      return { success: false, error: "Target facility does not belong to the village's mandal", status: 400 };
    }
    village.facilityId = facilityId;
  }

  const before = village.toObject();
  if (name) village.name = name.trim();
  if (status && ["active", "inactive"].includes(status)) village.status = status;

  await village.save();

  await logAudit({
    actor,
    entityType: "Village",
    entityId: village._id,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: village,
  });

  return { success: true, item: village.toSafeObject(), status: 200 };
}

export async function toggleVillageStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const village = await Village.findById(id);
  if (!village) {
    return { success: false, error: "Village not found", status: 404 };
  }

  const before = village.toObject();
  village.status = status;
  await village.save();

  await logAudit({
    actor,
    entityType: "Village",
    entityId: village._id,
    action: "STATUS_CHANGE",
    before,
    after: village,
  });

  return { success: true, item: village.toSafeObject(), status: 200 };
}

/* =========================================================================
   STAKEHOLDER SERVICE
   ========================================================================= */

export async function listStakeholders({ projectId = "", mandalId = "", facilityId = "", villageId = "", stakeholderType = "", search = "", status = "", page = 1, limit = 50 } = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.projectId = projectId;
  if (mandalId) query.mandalId = mandalId;
  if (facilityId) query.facilityId = facilityId;
  if (villageId) query.villageId = villageId;
  if (stakeholderType) {
    if (stakeholderType === "doctor") {
      query.stakeholderType = { $in: ["doctor", "facility_staff"] };
    } else {
      query.stakeholderType = stakeholderType;
    }
  }
  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ fullName: regex }, { designation: regex }, { phone: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [total, stakeholders] = await Promise.all([
    Stakeholder.countDocuments(query),
    Stakeholder.find(query)
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit)
      .populate("projectId", "name code")
      .populate("mandalId", "name code")
      .populate("facilityId", "name code facilityType")
      .populate("villageId", "name code"),
  ]);

  return {
    items: stakeholders.map((s) => s.toSafeObject()),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getStakeholderById(id) {
  await connectToDatabase();
  const stakeholder = await Stakeholder.findById(id)
    .populate("projectId", "name code")
    .populate("mandalId", "name code")
    .populate("facilityId", "name code facilityType")
    .populate("villageId", "name code");
  return stakeholder ? stakeholder.toSafeObject() : null;
}

export async function createStakeholder({ fullName, stakeholderType, projectId, mandalId, facilityId = null, villageId = null, phone = "", designation = "" }, actor) {
  if (!fullName || !stakeholderType || !projectId || !mandalId) {
    return { success: false, error: "Full name, stakeholder type, project, and mandal are required", status: 400 };
  }

  const validTypes = ["asha", "facility_staff", "government_official", "doctor"];
  if (!validTypes.includes(stakeholderType)) {
    return { success: false, error: `Invalid stakeholder type. Must be one of: ${validTypes.join(", ")}`, status: 400 };
  }

  // Normalize doctor to facility_staff with Doctor designation if needed
  let normalizedType = stakeholderType;
  let normalizedDesignation = designation ? designation.trim() : "";
  if (stakeholderType === "doctor") {
    normalizedType = "facility_staff";
    if (!normalizedDesignation) normalizedDesignation = "Doctor / Medical Officer";
  }

  await connectToDatabase();

  const [project, mandal] = await Promise.all([
    Project.findById(projectId),
    Mandal.findById(mandalId),
  ]);

  if (!project || project.status !== "active") {
    return { success: false, error: "Associated project is invalid or inactive", status: 400 };
  }
  if (!mandal || mandal.status !== "active") {
    return { success: false, error: "Associated mandal is invalid or inactive", status: 400 };
  }
  if (mandal.projectId.toString() !== projectId) {
    return { success: false, error: "Selected mandal does not belong to the selected project", status: 400 };
  }

  if (facilityId) {
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.status !== "active") {
      return { success: false, error: "Associated facility is invalid or inactive", status: 400 };
    }
    if (facility.mandalId.toString() !== mandalId) {
      return { success: false, error: "Selected facility does not belong to the selected mandal", status: 400 };
    }
  }

  if (villageId) {
    const village = await Village.findById(villageId);
    if (!village || village.status !== "active") {
      return { success: false, error: "Associated village is invalid or inactive", status: 400 };
    }
    if (village.mandalId.toString() !== mandalId) {
      return { success: false, error: "Selected village does not belong to the selected mandal", status: 400 };
    }
  }

  // Duplicate prevention: check if a stakeholder with same name or phone exists in the mandal
  const escapedName = fullName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicateQuery = {
    projectId,
    mandalId,
    stakeholderType: normalizedType,
  };

  if (phone && phone.trim()) {
    duplicateQuery.$or = [
      { fullName: new RegExp(`^${escapedName}$`, "i") },
      { phone: phone.trim() },
    ];
  } else {
    duplicateQuery.fullName = new RegExp(`^${escapedName}$`, "i");
  }

  const existingStakeholder = await Stakeholder.findOne(duplicateQuery)
    .populate("projectId", "name code")
    .populate("mandalId", "name code")
    .populate("facilityId", "name code facilityType")
    .populate("villageId", "name code");

  if (existingStakeholder) {
    return {
      success: false,
      error: `Stakeholder "${existingStakeholder.fullName}" already exists in this catchment.`,
      status: 409,
      item: existingStakeholder.toSafeObject(),
    };
  }

  const stakeholder = await Stakeholder.create({
    fullName: fullName.trim(),
    stakeholderType: normalizedType,
    projectId,
    mandalId,
    facilityId: facilityId || null,
    villageId: villageId || null,
    phone: phone ? phone.trim() : "",
    designation: normalizedDesignation,
    status: "active",
  });

  await logAudit({
    actor,
    entityType: "Stakeholder",
    entityId: stakeholder._id,
    action: "CREATE",
    after: stakeholder,
  });

  return { success: true, item: stakeholder.toSafeObject(), status: 201 };
}

export async function updateStakeholder(id, { fullName, facilityId, phone, designation, status }, actor) {
  await connectToDatabase();
  const stakeholder = await Stakeholder.findById(id);
  if (!stakeholder) {
    return { success: false, error: "Stakeholder not found", status: 404 };
  }

  if (facilityId && facilityId !== stakeholder.facilityId?.toString()) {
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.status !== "active") {
      return { success: false, error: "Target facility is invalid or inactive", status: 400 };
    }
    if (facility.mandalId.toString() !== stakeholder.mandalId.toString()) {
      return { success: false, error: "Target facility does not belong to the stakeholder's mandal", status: 400 };
    }
    stakeholder.facilityId = facilityId;
  }

  const before = stakeholder.toObject();
  if (fullName) stakeholder.fullName = fullName.trim();
  if (phone !== undefined) stakeholder.phone = phone.trim();
  if (designation !== undefined) stakeholder.designation = designation.trim();
  if (status && ["active", "inactive"].includes(status)) stakeholder.status = status;

  await stakeholder.save();

  await logAudit({
    actor,
    entityType: "Stakeholder",
    entityId: stakeholder._id,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    before,
    after: stakeholder,
  });

  return { success: true, item: stakeholder.toSafeObject(), status: 200 };
}

export async function toggleStakeholderStatus(id, status, actor) {
  if (!["active", "inactive"].includes(status)) {
    return { success: false, error: "Status must be 'active' or 'inactive'", status: 400 };
  }

  await connectToDatabase();
  const stakeholder = await Stakeholder.findById(id);
  if (!stakeholder) {
    return { success: false, error: "Stakeholder not found", status: 404 };
  }

  const before = stakeholder.toObject();
  stakeholder.status = status;
  await stakeholder.save();

  await logAudit({
    actor,
    entityType: "Stakeholder",
    entityId: stakeholder._id,
    action: "STATUS_CHANGE",
    before,
    after: stakeholder,
  });

  return { success: true, item: stakeholder.toSafeObject(), status: 200 };
}
