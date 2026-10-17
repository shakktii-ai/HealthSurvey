import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import Family from "@/models/Family";
import Project from "@/models/Project";
import SurveyRound from "@/models/SurveyRound";
import User from "@/models/User";
import Village from "@/models/Village";
import Stakeholder from "@/models/Stakeholder";
import Counter from "@/models/Counter";
import { logAudit } from "@/lib/audit";

/**
 * Validate that a field worker exists, is active, and has the role 'field_worker'.
 */
export async function validateFieldWorker(workerId) {
  if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
    const err = new Error("Invalid Field Worker identifier");
    err.statusCode = 400;
    throw err;
  }
  const worker = await User.findById(workerId);
  if (!worker || worker.status !== "active") {
    const err = new Error("Field worker does not exist or is inactive");
    err.statusCode = 400;
    throw err;
  }
  if (worker.role !== "field_worker") {
    const err = new Error("Selected user does not have the 'field_worker' role");
    err.statusCode = 400;
    throw err;
  }
  return worker;
}

/**
 * Validate project and survey round existence, active status, and mutual compatibility.
 */
export async function validateProjectAndRound(projectId, roundId) {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    const err = new Error("Invalid Project identifier");
    err.statusCode = 400;
    throw err;
  }
  if (!roundId || !mongoose.Types.ObjectId.isValid(roundId)) {
    const err = new Error("Invalid Survey Round identifier");
    err.statusCode = 400;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project || project.status !== "active") {
    const err = new Error("Project does not exist or is inactive");
    err.statusCode = 400;
    throw err;
  }

  const round = await SurveyRound.findById(roundId);
  if (!round) {
    const err = new Error("Survey round does not exist");
    err.statusCode = 400;
    throw err;
  }
  if (round.status === "cancelled") {
    const err = new Error("Cannot assign fieldwork to a cancelled survey round");
    err.statusCode = 400;
    throw err;
  }

  const roundProjectId = round.project?._id
    ? round.project._id.toString()
    : round.project?.toString();
  if (roundProjectId !== projectId.toString()) {
    const err = new Error("Survey round does not belong to the selected project");
    err.statusCode = 400;
    throw err;
  }

  return { project, round };
}

/**
 * Validate that a family exists, is active, and belongs to the given project.
 */
export async function validateFamily(familyId, projectId) {
  if (!familyId || !mongoose.Types.ObjectId.isValid(familyId)) {
    const err = new Error("Invalid Family identifier");
    err.statusCode = 400;
    throw err;
  }

  const family = await Family.findById(familyId);
  if (!family || family.status !== "active") {
    const err = new Error("Family record does not exist or is inactive");
    err.statusCode = 400;
    throw err;
  }

  const famProjId = family.project?._id
    ? family.project._id.toString()
    : family.project?.toString();
  if (famProjId !== projectId.toString()) {
    const err = new Error("Family does not belong to the selected project");
    err.statusCode = 400;
    throw err;
  }

  return family;
}

/**
 * 1. Single-Family Assignment Creation
 */
export async function createFamilyAssignment(
  { projectId, surveyRoundId, fieldWorkerId, familyId, dueDate = null },
  actor
) {
  await connectToDatabase();

  const worker = await validateFieldWorker(fieldWorkerId);
  const { round } = await validateProjectAndRound(projectId, surveyRoundId);
  const family = await validateFamily(familyId, projectId);

  // Check for duplicate active/completed assignment
  const existing = await Assignment.findOne({
    surveyRound: surveyRoundId,
    family: familyId,
    status: { $in: ["assigned", "in_progress", "completed"] },
  }).populate("fieldWorker", "name email");

  if (existing) {
    const err = new Error(
      `Family ${family.familyCode} is already assigned for Survey Round '${round.name}' (Status: ${existing.status}, Worker: ${existing.fieldWorker?.name || "Unknown"}). Reassignment or cancellation is required to transfer this task.`
    );
    err.statusCode = 409;
    err.existingAssignment = {
      id: existing._id.toString(),
      code: existing.assignmentCode,
      status: existing.status,
      assignedWorker: existing.fieldWorker?.name,
      assignedWorkerId: existing.fieldWorker?._id?.toString(),
      assignedAt: existing.assignedAt,
    };
    throw err;
  }

  // Generate safe atomic assignment code
  const seq = await Counter.getNextSequence("assignment_code");
  const assignmentCode = `ASG-${String(seq).padStart(5, "0")}`;

  const assignment = await Assignment.create({
    assignmentCode,
    project: projectId,
    surveyRound: surveyRoundId,
    fieldWorker: fieldWorkerId,
    assignmentType: "single_family",
    family: familyId,
    village: family.village,
    mandal: family.mandal,
    facility: family.facility,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "assigned",
    createdBy: actor.id,
  });

  await logAudit({
    actor,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "CREATE",
    after: {
      assignmentCode,
      project: projectId,
      surveyRound: surveyRoundId,
      fieldWorker: worker.email,
      familyCode: family.familyCode,
      dueDate: assignment.dueDate,
    },
  });

  const populated = await Assignment.findById(assignment._id)
    .populate("project", "name code")
    .populate("surveyRound", "name code")
    .populate("fieldWorker", "name email")
    .populate("family", "familyCode householdHeadName village mandal facility")
    .populate("village", "name code")
    .populate("mandal", "name code")
    .populate("facility", "name code")
    .lean();

  return {
    ...populated,
    id: populated._id.toString(),
  };
}

/**
 * 2. Village-Batch Preview
 */
export async function previewVillageBatch({ projectId, surveyRoundId, villageId }) {
  await connectToDatabase();

  await validateProjectAndRound(projectId, surveyRoundId);

  if (!villageId || !mongoose.Types.ObjectId.isValid(villageId)) {
    const err = new Error("Invalid Village identifier");
    err.statusCode = 400;
    throw err;
  }

  const village = await Village.findById(villageId);
  if (!village) {
    const err = new Error("Village not found");
    err.statusCode = 400;
    throw err;
  }

  // Fetch all families in village
  const families = await Family.find({
    village: villageId,
    project: projectId,
  })
    .select("familyCode householdHeadName status")
    .lean();

  const totalFamilies = families.length;
  const activeFamilies = families.filter((f) => f.status === "active");
  const inactiveFamilies = families.filter((f) => f.status !== "active");

  const activeFamilyIds = activeFamilies.map((f) => f._id);

  // Check existing assignments for this survey round
  const existingAssignments = await Assignment.find({
    surveyRound: surveyRoundId,
    family: { $in: activeFamilyIds },
    status: { $in: ["assigned", "in_progress", "completed"] },
  })
    .select("family status")
    .lean();

  const assignedFamilyIdSet = new Set(
    existingAssignments.map((a) => a.family.toString())
  );

  const eligibleFamilies = activeFamilies.filter(
    (f) => !assignedFamilyIdSet.has(f._id.toString())
  );
  const alreadyAssignedFamilies = activeFamilies.filter((f) =>
    assignedFamilyIdSet.has(f._id.toString())
  );

  return {
    village: {
      id: village._id.toString(),
      name: village.name,
      code: village.code,
    },
    totalFamilies,
    activeFamiliesCount: activeFamilies.length,
    eligibleCount: eligibleFamilies.length,
    alreadyAssignedCount: alreadyAssignedFamilies.length,
    ineligibleCount: inactiveFamilies.length,
    eligibleFamilies: eligibleFamilies.map((f) => ({
      id: f._id.toString(),
      familyCode: f.familyCode,
      householdHeadName: f.householdHeadName,
    })),
    alreadyAssignedFamilies: alreadyAssignedFamilies.map((f) => ({
      id: f._id.toString(),
      familyCode: f.familyCode,
      householdHeadName: f.householdHeadName,
    })),
    skippedFamilies: inactiveFamilies.map((f) => ({
      id: f._id.toString(),
      familyCode: f.familyCode,
      householdHeadName: f.householdHeadName,
      reason: "Inactive household record",
    })),
  };
}

/**
 * 3. Village-Batch Assignment Execution
 */
export async function createVillageBatchAssignments(
  { projectId, surveyRoundId, villageId, fieldWorkerId, dueDate = null },
  actor
) {
  await connectToDatabase();

  const worker = await validateFieldWorker(fieldWorkerId);
  const { round } = await validateProjectAndRound(projectId, surveyRoundId);

  if (!villageId || !mongoose.Types.ObjectId.isValid(villageId)) {
    const err = new Error("Invalid Village identifier");
    err.statusCode = 400;
    throw err;
  }

  const village = await Village.findById(villageId);
  if (!village) {
    const err = new Error("Village not found");
    err.statusCode = 400;
    throw err;
  }

  // Fresh server-side check of families in village
  const allFamilies = await Family.find({
    village: villageId,
    project: projectId,
  }).select("_id familyCode status village mandal facility");

  const activeFamilies = allFamilies.filter((f) => f.status === "active");
  const inactiveFamilies = allFamilies.filter((f) => f.status !== "active");

  const existingAssignments = await Assignment.find({
    surveyRound: surveyRoundId,
    family: { $in: activeFamilies.map((f) => f._id) },
    status: { $in: ["assigned", "in_progress", "completed"] },
  }).select("family");

  const assignedFamilyIds = new Set(
    existingAssignments.map((a) => a.family.toString())
  );

  const eligibleToAssign = activeFamilies.filter(
    (f) => !assignedFamilyIds.has(f._id.toString())
  );

  const createdAssignments = [];
  const failures = [];

  for (const fam of eligibleToAssign) {
    try {
      const seq = await Counter.getNextSequence("assignment_code");
      const assignmentCode = `ASG-${String(seq).padStart(5, "0")}`;

      const doc = await Assignment.create({
        assignmentCode,
        project: projectId,
        surveyRound: surveyRoundId,
        fieldWorker: fieldWorkerId,
        assignmentType: "village_batch",
        family: fam._id,
        village: fam.village,
        mandal: fam.mandal,
        facility: fam.facility,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "assigned",
        createdBy: actor.id,
      });

      createdAssignments.push(doc);
    } catch (err) {
      failures.push({
        familyId: fam._id.toString(),
        familyCode: fam.familyCode,
        error: err.message,
      });
    }
  }

  // Audit record for the batch action
  await logAudit({
    actor,
    entityType: "Assignment",
    entityId: village._id,
    action: "CREATE",
    after: {
      actionType: "village_batch_assignment",
      villageCode: village.code,
      surveyRoundCode: round.code,
      workerEmail: worker.email,
      createdCount: createdAssignments.length,
      skippedAssignedCount: assignedFamilyIds.size,
      skippedInactiveCount: inactiveFamilies.length,
      failedCount: failures.length,
    },
  });

  return {
    success: true,
    village: { id: village._id.toString(), name: village.name, code: village.code },
    totalActiveFamilies: activeFamilies.length,
    createdCount: createdAssignments.length,
    alreadyAssignedCount: assignedFamilyIds.size,
    ineligibleCount: inactiveFamilies.length,
    failedCount: failures.length,
    failures,
    createdAssignmentCodes: createdAssignments.map((a) => a.assignmentCode),
  };
}

/**
 * 4. Stakeholder Task Assignment
 */
export async function createStakeholderTask(
  { projectId, surveyRoundId, stakeholderId, category, fieldWorkerId, dueDate = null },
  actor
) {
  await connectToDatabase();

  const worker = await validateFieldWorker(fieldWorkerId);
  const { round } = await validateProjectAndRound(projectId, surveyRoundId);

  // Check light-touch restriction
  if (category === "light_touch" && !round.enableLightTouch) {
    const err = new Error(
      `Light-touch questionnaire cannot be assigned because Survey Round '${round.name}' does not have Light-touch enabled.`
    );
    err.statusCode = 400;
    throw err;
  }

  if (!stakeholderId || !mongoose.Types.ObjectId.isValid(stakeholderId)) {
    const err = new Error("Invalid Stakeholder identifier");
    err.statusCode = 400;
    throw err;
  }

  const stakeholder = await Stakeholder.findById(stakeholderId);
  if (!stakeholder || stakeholder.status !== "active") {
    const err = new Error("Stakeholder record does not exist or is inactive");
    err.statusCode = 400;
    throw err;
  }

  const stkProjId = stakeholder.projectId?._id
    ? stakeholder.projectId._id.toString()
    : stakeholder.projectId?.toString();
  if (stkProjId !== projectId.toString()) {
    const err = new Error("Stakeholder does not belong to the selected project");
    err.statusCode = 400;
    throw err;
  }

  // Prevent duplicate interview tasks for the same stakeholder, project, round, and category
  const existing = await StakeholderTask.findOne({
    project: projectId,
    surveyRound: surveyRoundId,
    stakeholder: stakeholderId,
    category,
    status: { $in: ["assigned", "in_progress", "completed"] },
  }).populate("fieldWorker", "name email");

  if (existing) {
    const err = new Error(
      `An active task already exists for stakeholder ${stakeholder.fullName} under Survey Round '${round.name}' and category '${category}' (Status: ${existing.status}, Worker: ${existing.fieldWorker?.name || "Worker"}). Shared interviews must not be duplicated.`
    );
    err.statusCode = 409;
    throw err;
  }

  const seq = await Counter.getNextSequence("stakeholder_task_code");
  const taskCode = `STK-${String(seq).padStart(5, "0")}`;

  const task = await StakeholderTask.create({
    taskCode,
    project: projectId,
    surveyRound: surveyRoundId,
    stakeholder: stakeholderId,
    category,
    fieldWorker: fieldWorkerId,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "assigned",
    createdBy: actor.id,
  });

  await logAudit({
    actor,
    entityType: "StakeholderTask",
    entityId: task._id,
    action: "CREATE",
    after: {
      taskCode,
      project: projectId,
      surveyRound: surveyRoundId,
      category,
      stakeholderName: stakeholder.fullName,
      workerEmail: worker.email,
    },
  });

  const populated = await StakeholderTask.findById(task._id)
    .populate("project", "name code")
    .populate("surveyRound", "name code enableLightTouch")
    .populate("stakeholder", "fullName stakeholderType designation phone")
    .populate("fieldWorker", "name email")
    .lean();

  return {
    ...populated,
    id: populated._id.toString(),
  };
}

/**
 * 5. List Assignments (Admin)
 */
export async function listAdminAssignments({
  projectId = "",
  surveyRoundId = "",
  fieldWorkerId = "",
  assignmentType = "",
  status = "",
  search = "",
  page = 1,
  limit = 20,
} = {}) {
  await connectToDatabase();

  const query = {};

  if (projectId) query.project = projectId;
  if (surveyRoundId) query.surveyRound = surveyRoundId;
  if (fieldWorkerId) query.fieldWorker = fieldWorkerId;
  if (assignmentType) query.assignmentType = assignmentType;
  if (status) query.status = status;

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    // Look up family codes matching search
    const matchingFamilies = await Family.find({
      $or: [{ familyCode: regex }, { householdHeadName: regex }],
    }).select("_id");
    const matchingFamilyIds = matchingFamilies.map((f) => f._id);

    query.$or = [
      { assignmentCode: regex },
      { family: { $in: matchingFamilyIds } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [totalCount, assignments] = await Promise.all([
    Assignment.countDocuments(query),
    Assignment.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code enableLightTouch")
      .populate("fieldWorker", "name email role")
      .populate("family", "familyCode householdHeadName phoneNumber village mandal facility status")
      .populate("village", "name code")
      .populate("mandal", "name code")
      .populate("facility", "name code")
      .populate("reassignmentHistory.previousWorker", "name email")
      .populate("reassignmentHistory.reassignedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  // Aggregate global status counts for filtered project/round
  const countsBaseQuery = {};
  if (projectId) countsBaseQuery.project = projectId;
  if (surveyRoundId) countsBaseQuery.surveyRound = surveyRoundId;

  const statusAgg = await Assignment.aggregate([
    { $match: countsBaseQuery },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = {
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  statusAgg.forEach((s) => {
    if (counts[s._id] !== undefined) {
      counts[s._id] = s.count;
      counts.total += s.count;
    }
  });

  return {
    items: assignments.map((a) => ({
      ...a,
      id: a._id.toString(),
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    },
    counts,
  };
}

/**
 * 6. List Assignments (Field Worker)
 */
export async function listFieldWorkerAssignments(
  workerId,
  { status = "", search = "", page = 1, limit = 20 } = {}
) {
  await connectToDatabase();

  const query = { fieldWorker: workerId };

  if (status) query.status = status;

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    const matchingFamilies = await Family.find({
      $or: [{ familyCode: regex }, { householdHeadName: regex }],
    }).select("_id");
    query.$or = [
      { assignmentCode: regex },
      { family: { $in: matchingFamilies.map((f) => f._id) } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [totalCount, assignments] = await Promise.all([
    Assignment.countDocuments(query),
    Assignment.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code")
      .populate("family", "familyCode householdHeadName village mandal facility status")
      .populate("village", "name code")
      .populate("mandal", "name code")
      .populate("facility", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  // Status counts for this field worker
  const statusAgg = await Assignment.aggregate([
    { $match: { fieldWorker: new mongoose.Types.ObjectId(workerId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = {
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  statusAgg.forEach((s) => {
    if (counts[s._id] !== undefined) {
      counts[s._id] = s.count;
      counts.total += s.count;
    }
  });

  return {
    items: assignments.map((a) => ({
      ...a,
      id: a._id.toString(),
      // Mask household head name for field worker summary list privacy
      family: a.family
        ? {
            ...a.family,
            householdHeadName: a.family.householdHeadName,
          }
        : null,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    },
    counts,
  };
}

/**
 * 7. Get Assignment by ID (Authorized)
 */
export async function getAssignmentById(assignmentId, user) {
  await connectToDatabase();

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid assignment ID");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId)
    .populate("project", "name code")
    .populate("surveyRound", "name code enableLightTouch")
    .populate("fieldWorker", "name email role")
    .populate("family", "familyCode householdHeadName phoneNumber village mandal facility status")
    .populate("village", "name code")
    .populate("mandal", "name code")
    .populate("facility", "name code")
    .populate("reassignmentHistory.previousWorker", "name email")
    .populate("reassignmentHistory.reassignedBy", "name email")
    .lean();

  if (!assignment) {
    const err = new Error("Assignment not found");
    err.statusCode = 404;
    throw err;
  }

  // Field workers can only view their own assignments
  if (user.role === "field_worker") {
    const workerId = assignment.fieldWorker?._id
      ? assignment.fieldWorker._id.toString()
      : assignment.fieldWorker?.toString();
    if (workerId !== user.id.toString()) {
      const err = new Error("You do not have permission to view this assignment");
      err.statusCode = 403;
      throw err;
    }
  }

  return {
    ...assignment,
    id: assignment._id.toString(),
  };
}

/**
 * 8. Start Assignment (Field Worker)
 */
export async function startAssignment(assignmentId, worker) {
  await connectToDatabase();

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid assignment ID");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found");
    err.statusCode = 404;
    throw err;
  }

  // Ensure worker owns this assignment
  if (assignment.fieldWorker.toString() !== worker.id.toString()) {
    const err = new Error("You are not authorized to start another worker's assignment");
    err.statusCode = 403;
    throw err;
  }

  if (assignment.status === "completed") {
    const err = new Error("This assignment is already completed");
    err.statusCode = 400;
    throw err;
  }

  if (assignment.status === "cancelled") {
    const err = new Error("Cannot start a cancelled assignment");
    err.statusCode = 400;
    throw err;
  }

  // Idempotent: If already in_progress, return existing
  if (assignment.status === "in_progress") {
    return {
      ...assignment.toObject(),
      id: assignment._id.toString(),
      message: "Assignment is already in progress",
    };
  }

  const beforeStatus = assignment.status;
  assignment.status = "in_progress";
  assignment.startedAt = new Date();
  await assignment.save();

  await logAudit({
    actor: worker,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "STATUS_CHANGE",
    before: { status: beforeStatus },
    after: { status: "in_progress", startedAt: assignment.startedAt },
  });

  return {
    ...assignment.toObject(),
    id: assignment._id.toString(),
    message: "Assignment started successfully",
  };
}

/**
 * 9. Cancel Assignment (Superadmin with mandatory reason)
 */
export async function cancelAssignment(assignmentId, { reason }, actor) {
  await connectToDatabase();

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    const err = new Error("A cancellation reason of at least 3 characters is required");
    err.statusCode = 400;
    throw err;
  }

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid assignment ID");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found");
    err.statusCode = 404;
    throw err;
  }

  if (assignment.status === "completed") {
    const err = new Error("Completed assignments cannot be cancelled");
    err.statusCode = 400;
    throw err;
  }

  if (assignment.status === "cancelled") {
    const err = new Error("Assignment is already cancelled");
    err.statusCode = 400;
    throw err;
  }

  const before = {
    status: assignment.status,
    cancellationReason: assignment.cancellationReason,
  };

  assignment.status = "cancelled";
  assignment.cancelledAt = new Date();
  assignment.cancelledBy = actor.id;
  assignment.cancellationReason = reason.trim();
  await assignment.save();

  await logAudit({
    actor,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "STATUS_CHANGE",
    before,
    after: {
      status: "cancelled",
      cancellationReason: assignment.cancellationReason,
      cancelledAt: assignment.cancelledAt,
    },
  });

  return {
    ...assignment.toObject(),
    id: assignment._id.toString(),
    message: "Assignment cancelled successfully",
  };
}

/**
 * 10. Reassign Assignment (Superadmin)
 */
export async function reassignAssignment(
  assignmentId,
  { newWorkerId, reason = "" },
  actor
) {
  await connectToDatabase();

  const newWorker = await validateFieldWorker(newWorkerId);

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid assignment ID");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found");
    err.statusCode = 404;
    throw err;
  }

  if (assignment.status === "completed") {
    const err = new Error("Completed assignments cannot be reassigned");
    err.statusCode = 400;
    throw err;
  }

  if (assignment.status === "cancelled") {
    const err = new Error(
      "Cancelled assignments cannot be reassigned. Please create a new assignment instead."
    );
    err.statusCode = 400;
    throw err;
  }

  if (assignment.fieldWorker.toString() === newWorkerId.toString()) {
    const err = new Error("Assignment is already assigned to this field worker");
    err.statusCode = 400;
    throw err;
  }

  const oldWorkerId = assignment.fieldWorker;

  assignment.reassignmentHistory.push({
    previousWorker: oldWorkerId,
    reassignedBy: actor.id,
    reassignedAt: new Date(),
    reason: reason.trim(),
  });

  assignment.fieldWorker = newWorkerId;
  // If task was in_progress, reset to assigned for the new worker
  if (assignment.status === "in_progress") {
    assignment.status = "assigned";
  }

  await assignment.save();

  await logAudit({
    actor,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "UPDATE",
    before: { fieldWorker: oldWorkerId },
    after: {
      fieldWorker: newWorkerId,
      reassignedTo: newWorker.email,
      reason: reason.trim(),
    },
  });

  const updated = await Assignment.findById(assignment._id)
    .populate("fieldWorker", "name email")
    .populate("reassignmentHistory.previousWorker", "name email")
    .lean();

  return {
    ...updated,
    id: updated._id.toString(),
    message: `Assignment successfully reassigned to ${newWorker.name}`,
  };
}

/**
 * 11. Update Assignment Due Date (Superadmin)
 */
export async function updateAssignmentDueDate(assignmentId, { dueDate }, actor) {
  await connectToDatabase();

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid assignment ID");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found");
    err.statusCode = 404;
    throw err;
  }

  if (assignment.status === "completed" || assignment.status === "cancelled") {
    const err = new Error("Cannot modify due date of completed or cancelled assignments");
    err.statusCode = 400;
    throw err;
  }

  const beforeDate = assignment.dueDate;
  assignment.dueDate = dueDate ? new Date(dueDate) : null;
  await assignment.save();

  await logAudit({
    actor,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "UPDATE",
    before: { dueDate: beforeDate },
    after: { dueDate: assignment.dueDate },
  });

  return {
    ...assignment.toObject(),
    id: assignment._id.toString(),
    message: "Due date updated successfully",
  };
}

/**
 * 12. List Stakeholder Tasks (Admin)
 */
export async function listStakeholderTasks({
  projectId = "",
  surveyRoundId = "",
  fieldWorkerId = "",
  category = "",
  status = "",
  search = "",
  page = 1,
  limit = 20,
} = {}) {
  await connectToDatabase();

  const query = {};
  if (projectId) query.project = projectId;
  if (surveyRoundId) query.surveyRound = surveyRoundId;
  if (fieldWorkerId) query.fieldWorker = fieldWorkerId;
  if (category) query.category = category;
  if (status) query.status = status;

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    const matchingStakeholders = await Stakeholder.find({
      fullName: regex,
    }).select("_id");
    query.$or = [
      { taskCode: regex },
      { stakeholder: { $in: matchingStakeholders.map((s) => s._id) } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [totalCount, tasks] = await Promise.all([
    StakeholderTask.countDocuments(query),
    StakeholderTask.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code enableLightTouch")
      .populate("stakeholder", "fullName stakeholderType designation phone")
      .populate("fieldWorker", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    items: tasks.map((t) => ({ ...t, id: t._id.toString() })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    },
  };
}

/**
 * 13. Cancel Stakeholder Task (Superadmin)
 */
export async function cancelStakeholderTask(taskId, { reason }, actor) {
  await connectToDatabase();

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    const err = new Error("A cancellation reason of at least 3 characters is required");
    err.statusCode = 400;
    throw err;
  }

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    const err = new Error("Invalid Task identifier");
    err.statusCode = 400;
    throw err;
  }

  const task = await StakeholderTask.findById(taskId);
  if (!task) {
    const err = new Error("Stakeholder task not found");
    err.statusCode = 404;
    throw err;
  }

  if (task.status === "completed") {
    const err = new Error("Completed stakeholder tasks cannot be cancelled");
    err.statusCode = 400;
    throw err;
  }

  if (task.status === "cancelled") {
    const err = new Error("Stakeholder task is already cancelled");
    err.statusCode = 400;
    throw err;
  }

  const before = { status: task.status, cancellationReason: task.cancellationReason };
  task.status = "cancelled";
  task.cancelledAt = new Date();
  task.cancelledBy = actor.id;
  task.cancellationReason = reason.trim();
  await task.save();

  await logAudit({
    actor,
    entityType: "StakeholderTask",
    entityId: task._id,
    action: "STATUS_CHANGE",
    before,
    after: {
      status: "cancelled",
      cancellationReason: task.cancellationReason,
      cancelledAt: task.cancelledAt,
    },
  });

  return {
    ...task.toObject(),
    id: task._id.toString(),
    message: "Stakeholder task cancelled successfully",
  };
}
