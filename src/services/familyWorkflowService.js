import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import Family from "@/models/Family";
import Stakeholder from "@/models/Stakeholder";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import Mandal from "@/models/Mandal";
import Project from "@/models/Project";
import SurveyRound from "@/models/SurveyRound";
import Counter from "@/models/Counter";
import { logAudit } from "@/lib/audit";

/**
 * Family-Linked Survey Workflow Service
 *
 * Implements the logical sequence for each assigned family and survey round:
 * 1. Family Questionnaire
 * 2. ASHA Interview linked to the family
 * 3. Facility Staff Interview linked to the relevant facility and project/village
 * 4. Government Official Interview, where applicable
 * 5. Light-touch Phone Call Questionnaire when the selected round and survey protocol require it
 */

/**
 * Verify authorization for accessing a family assignment.
 */
async function verifyAssignmentAccess(assignmentId, user) {
  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Invalid Assignment identifier");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await Assignment.findById(assignmentId)
    .populate("project", "name code status")
    .populate("surveyRound", "name code targetTiming enableLightTouch status plannedStartDate plannedEndDate")
    .populate("family", "familyCode householdHeadName phoneNumber normalizedPhone village mandal facility asha status")
    .populate("village", "name code")
    .populate("mandal", "name code")
    .populate("facility", "name code facilityType")
    .populate("fieldWorker", "name email");

  if (!assignment) {
    const err = new Error("Family assignment not found");
    err.statusCode = 404;
    throw err;
  }

  if (assignment.status === "cancelled") {
    const err = new Error("This assignment has been cancelled and is no longer active");
    err.statusCode = 400;
    throw err;
  }

  // Enforce assignment ownership: field worker cannot access unauthorized assignments
  if (user.role === "field_worker") {
    const assignedWorkerId = assignment.fieldWorker?._id
      ? assignment.fieldWorker._id.toString()
      : assignment.fieldWorker?.toString();
    if (assignedWorkerId !== user.id.toString()) {
      const err = new Error("Unauthorized: This family assignment is allocated to another field worker.");
      err.statusCode = 403;
      throw err;
    }
  }

  return assignment;
}

/**
 * Resolves the 5 sequential tasks for a family assignment and evaluates overall round completion.
 */
export async function getFamilyWorkflow(assignmentId, user) {
  await connectToDatabase();

  const assignment = await verifyAssignmentAccess(assignmentId, user);
  const family = assignment.family;
  const surveyRound = assignment.surveyRound;
  const project = assignment.project;

  // 1. Task 1: Family Questionnaire
  const familyResponse = await SurveyResponse.findOne({
    assignment: assignment._id,
    category: "family",
  }).lean();

  let familyStatus = "pending";
  if (assignment.status === "completed" || familyResponse?.status === "submitted" || familyResponse?.status === "amended") {
    familyStatus = "completed";
  } else if (assignment.status === "in_progress" || familyResponse?.status === "draft") {
    familyStatus = "in_progress";
  } else if (assignment.status === "not_required") {
    familyStatus = "not_required";
  }

  const task1 = {
    taskKey: "family",
    order: 1,
    title: "Family Questionnaire",
    category: "family",
    status: familyStatus,
    isRequired: true,
    isApplicable: true,
    url: `/field/survey/${assignment._id}?type=family`,
    responseCode: familyResponse?.responseCode || null,
    submittedAt: familyResponse?.submittedAt || assignment.completedAt || null,
    targetType: "family",
    targetName: family?.householdHeadName || "Household Head",
    code: assignment.assignmentCode,
  };

  // Helper: check assignment task overrides
  const overrides = assignment.taskOverrides || [];
  const getOverride = (key) => overrides.find((o) => o.taskKey === key);

  // 2. Task 2: ASHA Interview linked to the family
  let ashaStakeholder = null;
  if (family?.asha) {
    ashaStakeholder = await Stakeholder.findById(family.asha).lean();
  }
  if (!ashaStakeholder && family?.village) {
    ashaStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "asha",
      $or: [{ village: family.village }, { villageId: family.village }],
      status: "active",
    }).lean();
  }
  if (!ashaStakeholder && family?.mandal) {
    ashaStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "asha",
      $or: [{ mandalId: family.mandal }, { mandal: family.mandal }],
      status: "active",
    }).lean();
  }
  if (!ashaStakeholder) {
    ashaStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "asha",
      status: "active",
    }).lean();
  }

  const ashaOverride = getOverride("asha");
  let ashaTask = null;
  if (ashaStakeholder) {
    ashaTask = await StakeholderTask.findOne({
      project: project._id,
      surveyRound: surveyRound._id,
      stakeholder: ashaStakeholder._id,
      category: "asha",
    }).populate("fieldWorker", "name email").lean();
  }

  let ashaStatus = "pending";
  let ashaReason = "";
  if (ashaOverride && ashaOverride.status === "not_required") {
    ashaStatus = "not_required";
    ashaReason = ashaOverride.reason;
  } else if (ashaTask) {
    if (ashaTask.status === "completed") {
      ashaStatus = "completed";
    } else if (ashaTask.status === "not_required") {
      ashaStatus = "not_required";
      ashaReason = ashaTask.notRequiredReason;
    } else if (ashaTask.status === "in_progress") {
      ashaStatus = "in_progress";
    } else {
      ashaStatus = "pending";
    }
  } else if (!ashaStakeholder) {
    ashaStatus = "not_required";
    ashaReason = "No ASHA worker assigned to this habitation/village.";
  }

  // Query available ASHAs in catchment
  const availableAshas = await Stakeholder.find({
    projectId: project._id,
    stakeholderType: "asha",
    $or: [
      { mandalId: family?.mandal || assignment.mandal?._id || assignment.mandal },
      { villageId: family?.village || assignment.village?._id || assignment.village },
    ],
    status: "active",
  }).select("fullName designation phone").sort({ fullName: 1 }).lean();

  const task2 = {
    taskKey: "asha",
    order: 2,
    title: "ASHA Interview",
    category: "asha",
    status: ashaStatus,
    isRequired: true,
    isApplicable: true,
    isShared: true,
    sharedNote: "Shared ASHA interview covers all households in this village catchment.",
    stakeholder: ashaStakeholder
      ? {
          id: ashaStakeholder._id.toString(),
          name: ashaStakeholder.fullName,
          designation: ashaStakeholder.designation || "ASHA Facilitator",
          phone: ashaStakeholder.phone,
        }
      : null,
    availableStakeholders: availableAshas.map((s) => ({
      id: s._id.toString(),
      name: s.fullName,
      designation: s.designation || "ASHA Facilitator",
      phone: s.phone,
    })),
    taskId: ashaTask ? ashaTask._id.toString() : null,
    taskCode: ashaTask?.taskCode || null,
    url: ashaTask ? `/field/survey/${ashaTask._id}?type=stakeholder` : null,
    notRequiredReason: ashaReason,
  };

  // 3. Task 3: Facility Staff Interview linked to the relevant facility
  const facilityId = assignment.facility?._id || assignment.facility || family?.facility;
  let facilityStaffStakeholder = null;
  if (facilityId) {
    facilityStaffStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "facility_staff",
      $or: [{ facilityId: facilityId }, { facility: facilityId }],
      status: "active",
    }).lean();
  }
  if (!facilityStaffStakeholder && family?.mandal) {
    facilityStaffStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "facility_staff",
      $or: [{ mandalId: family.mandal }, { mandal: family.mandal }],
      status: "active",
    }).lean();
  }
  if (!facilityStaffStakeholder) {
    facilityStaffStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "facility_staff",
      status: "active",
    }).lean();
  }

  const staffOverride = getOverride("facility_staff");
  let staffTask = null;
  if (facilityStaffStakeholder) {
    staffTask = await StakeholderTask.findOne({
      project: project._id,
      surveyRound: surveyRound._id,
      stakeholder: facilityStaffStakeholder._id,
      category: "facility_staff",
    }).populate("fieldWorker", "name email").lean();
  }

  let staffStatus = "pending";
  let staffReason = "";
  if (staffOverride && staffOverride.status === "not_required") {
    staffStatus = "not_required";
    staffReason = staffOverride.reason;
  } else if (staffTask) {
    if (staffTask.status === "completed") {
      staffStatus = "completed";
    } else if (staffTask.status === "not_required") {
      staffStatus = "not_required";
      staffReason = staffTask.notRequiredReason;
    } else if (staffTask.status === "in_progress") {
      staffStatus = "in_progress";
    } else {
      staffStatus = "pending";
    }
  } else if (!facilityStaffStakeholder) {
    staffStatus = "not_required";
    staffReason = "No primary healthcare facility staff registered for this catchment.";
  }

  // Query available facility staff in catchment
  const availableStaff = await Stakeholder.find({
    projectId: project._id,
    stakeholderType: { $in: ["facility_staff", "doctor"] },
    $or: [
      { facilityId: assignment.facility?._id || assignment.facility || family?.facility },
      { mandalId: family?.mandal || assignment.mandal?._id || assignment.mandal },
    ],
    status: "active",
  }).select("fullName designation phone").sort({ fullName: 1 }).lean();

  const task3 = {
    taskKey: "facility_staff",
    order: 3,
    title: "Facility Staff Interview",
    category: "facility_staff",
    status: staffStatus,
    isRequired: true,
    isApplicable: true,
    isShared: true,
    sharedNote: "Shared facility staff interview covers all households linked to this PHC.",
    facility: assignment.facility ? { id: assignment.facility._id.toString(), name: assignment.facility.name } : null,
    stakeholder: facilityStaffStakeholder
      ? {
          id: facilityStaffStakeholder._id.toString(),
          name: facilityStaffStakeholder.fullName,
          designation: facilityStaffStakeholder.designation || "Medical Officer",
          phone: facilityStaffStakeholder.phone,
        }
      : null,
    availableStakeholders: availableStaff.map((s) => ({
      id: s._id.toString(),
      name: s.fullName,
      designation: s.designation || "Facility Staff / Doctor",
      phone: s.phone,
    })),
    taskId: staffTask ? staffTask._id.toString() : null,
    taskCode: staffTask?.taskCode || null,
    url: staffTask ? `/field/survey/${staffTask._id}?type=stakeholder` : null,
    notRequiredReason: staffReason,
  };

  // 4. Task 4: Government Official Interview, where applicable
  let govtOfficialStakeholder = null;
  if (family?.mandal) {
    govtOfficialStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "government_official",
      mandalId: family.mandal,
      status: "active",
    }).lean();
  }
  if (!govtOfficialStakeholder) {
    govtOfficialStakeholder = await Stakeholder.findOne({
      projectId: project._id,
      stakeholderType: "government_official",
      status: "active",
    }).lean();
  }

  const govtOverride = getOverride("govt_official");
  let govtTask = null;
  if (govtOfficialStakeholder) {
    govtTask = await StakeholderTask.findOne({
      project: project._id,
      surveyRound: surveyRound._id,
      stakeholder: govtOfficialStakeholder._id,
      category: "govt_official",
    }).populate("fieldWorker", "name email").lean();
  }

  let govtStatus = "pending";
  let govtReason = "";
  if (govtOverride && govtOverride.status === "not_required") {
    govtStatus = "not_required";
    govtReason = govtOverride.reason;
  } else if (govtTask) {
    if (govtTask.status === "completed") {
      govtStatus = "completed";
    } else if (govtTask.status === "not_required") {
      govtStatus = "not_required";
      govtReason = govtTask.notRequiredReason;
    } else if (govtTask.status === "in_progress") {
      govtStatus = "in_progress";
    } else {
      govtStatus = "pending";
    }
  } else if (!govtOfficialStakeholder) {
    govtStatus = "not_required";
    govtReason = "No government administrative assessment required for this round/habitation.";
  }

  // Query available govt officials in mandal
  const availableGovt = await Stakeholder.find({
    projectId: project._id,
    stakeholderType: "government_official",
    mandalId: family?.mandal || assignment.mandal?._id || assignment.mandal,
    status: "active",
  }).select("fullName designation phone").sort({ fullName: 1 }).lean();

  const task4 = {
    taskKey: "govt_official",
    order: 4,
    title: "Government Official Interview",
    category: "govt_official",
    status: govtStatus,
    isRequired: false, // Where applicable
    isApplicable: true,
    isShared: true,
    sharedNote: "Mandal administrative assessment shared across village clusters.",
    stakeholder: govtOfficialStakeholder
      ? {
          id: govtOfficialStakeholder._id.toString(),
          name: govtOfficialStakeholder.fullName,
          designation: govtOfficialStakeholder.designation || "Administrative Official",
          phone: govtOfficialStakeholder.phone,
        }
      : null,
    availableStakeholders: availableGovt.map((s) => ({
      id: s._id.toString(),
      name: s.fullName,
      designation: s.designation || "Government Official",
      phone: s.phone,
    })),
    taskId: govtTask ? govtTask._id.toString() : null,
    taskCode: govtTask?.taskCode || null,
    url: govtTask ? `/field/survey/${govtTask._id}?type=stakeholder` : null,
    notRequiredReason: govtReason,
  };

  // 5. Task 5: Light-touch Phone Call Questionnaire
  // Applicable ONLY when surveyRound.enableLightTouch === true
  const isLightTouchAllowedByRound = !!surveyRound.enableLightTouch;
  const phoneOverride = getOverride("light_touch");
  
  // Look for phone questionnaire response
  const phoneResponse = await SurveyResponse.findOne({
    assignment: assignment._id,
    category: "light_touch",
  }).lean();

  let phoneTask = null;
  if (isLightTouchAllowedByRound && ashaStakeholder) {
    // If phone task was assigned as a stakeholder task
    phoneTask = await StakeholderTask.findOne({
      project: project._id,
      surveyRound: surveyRound._id,
      category: "light_touch",
      fieldWorker: assignment.fieldWorker?._id || assignment.fieldWorker,
    }).lean();
  }

  let phoneStatus = "not_required";
  let phoneReason = "";
  if (!isLightTouchAllowedByRound) {
    phoneStatus = "not_required";
    phoneReason = `Light-touch phone survey is not enabled for ${surveyRound.name} (${surveyRound.code}). Full field interview protocol active.`;
  } else if (phoneOverride && phoneOverride.status === "not_required") {
    phoneStatus = "not_required";
    phoneReason = phoneOverride.reason;
  } else if (phoneResponse?.status === "submitted" || phoneResponse?.status === "amended" || phoneTask?.status === "completed") {
    phoneStatus = "completed";
  } else if (phoneResponse?.status === "draft" || phoneTask?.status === "in_progress") {
    phoneStatus = "in_progress";
  } else {
    phoneStatus = "pending";
  }

  const task5 = {
    taskKey: "light_touch",
    order: 5,
    title: "Light-touch Phone Call Questionnaire",
    category: "light_touch",
    status: phoneStatus,
    isRequired: isLightTouchAllowedByRound,
    isApplicable: isLightTouchAllowedByRound,
    phoneOwner: family?.phoneOwner || "own",
    phoneNumber: family?.phoneNumber ? "••••••" : "No Phone",
    url: isLightTouchAllowedByRound
      ? phoneTask
        ? `/field/survey/${phoneTask._id}?type=stakeholder`
        : `/field/survey/${assignment._id}?type=family&category=light_touch`
      : null,
    notRequiredReason: phoneReason,
  };

  const allTasks = [task1, task2, task3, task4, task5];

  // Calculate Next Applicable Task in logical order
  let nextTask = null;
  for (const t of allTasks) {
    if (t.status === "pending" || t.status === "in_progress") {
      nextTask = t;
      break;
    }
  }

  // Calculate Overall Round Completion
  // A round can become Completed ONLY when:
  // - every required task for that round is Completed
  // - every legitimately inapplicable task is explicitly marked Not Required with a reason and audit trail
  // - a skipped, missing, draft or failed questionnaire must never be treated as Completed
  const hasUnfinishedTask = allTasks.some(
    (t) => t.status === "pending" || t.status === "in_progress"
  );

  let roundStatus = "in_progress";
  if (allTasks.every((t) => t.status === "pending")) {
    roundStatus = "pending";
  } else if (!hasUnfinishedTask && allTasks.every((t) => t.status === "completed" || t.status === "not_required")) {
    roundStatus = "completed";
  } else {
    roundStatus = "in_progress";
  }

  // Update assignment roundStatus if changed
  if (assignment.roundStatus !== roundStatus) {
    const roundCompletedAt = roundStatus === "completed" ? new Date() : null;
    assignment.roundStatus = roundStatus;
    assignment.roundCompletedAt = roundCompletedAt;
    await Assignment.updateOne(
      { _id: assignment._id },
      { $set: { roundStatus, roundCompletedAt } }
    );
  }

  return {
    assignment: {
      id: assignment._id.toString(),
      assignmentCode: assignment.assignmentCode,
      status: assignment.status,
      roundStatus: assignment.roundStatus,
      roundCompletedAt: assignment.roundCompletedAt,
      assignedAt: assignment.assignedAt,
      dueDate: assignment.dueDate,
    },
    family: {
      id: family?._id ? family._id.toString() : "",
      familyCode: family?.familyCode || "",
      householdHeadName: family?.householdHeadName || "",
      village: assignment.village?.name || "",
      villageId: assignment.village?._id ? assignment.village._id.toString() : (assignment.village?.toString() || (family?.village ? family.village.toString() : "")),
      mandal: assignment.mandal?.name || "",
      mandalId: assignment.mandal?._id ? assignment.mandal._id.toString() : (assignment.mandal?.toString() || (family?.mandal ? family.mandal.toString() : "")),
      facility: assignment.facility?.name || "",
      facilityId: assignment.facility?._id ? assignment.facility._id.toString() : (assignment.facility?.toString() || (family?.facility ? family.facility.toString() : "")),
      ashaId: family?.asha ? family.asha.toString() : null,
    },
    project: {
      id: project._id.toString(),
      name: project.name,
      code: project.code,
    },
    surveyRound: {
      id: surveyRound._id.toString(),
      name: surveyRound.name,
      code: surveyRound.code,
      targetTiming: surveyRound.targetTiming,
      enableLightTouch: surveyRound.enableLightTouch,
    },
    tasks: allTasks,
    nextTask,
    isRoundCompleted: roundStatus === "completed",
    completionSummary: {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      notRequired: allTasks.filter((t) => t.status === "not_required").length,
      inProgress: allTasks.filter((t) => t.status === "in_progress").length,
      pending: allTasks.filter((t) => t.status === "pending").length,
    },
  };
}

/**
 * Mark a specific workflow task as Not Required with mandatory reason and audit logging.
 */
export async function markTaskNotRequired({ assignmentId, taskKey, reason, user }) {
  await connectToDatabase();

  if (!reason || reason.trim().length < 5) {
    const err = new Error("A specific explanation reason (at least 5 characters) is required to mark a task as Not Required.");
    err.statusCode = 400;
    throw err;
  }

  const assignment = await verifyAssignmentAccess(assignmentId, user);
  const now = new Date();

  // Find or create override
  if (!assignment.taskOverrides) assignment.taskOverrides = [];
  const existingIdx = assignment.taskOverrides.findIndex((o) => o.taskKey === taskKey);

  const overrideData = {
    taskKey,
    status: "not_required",
    reason: reason.trim(),
    markedBy: user.id,
    markedAt: now,
  };

  if (existingIdx >= 0) {
    assignment.taskOverrides[existingIdx] = overrideData;
  } else {
    assignment.taskOverrides.push(overrideData);
  }

  await Assignment.updateOne(
    { _id: assignment._id },
    { $set: { taskOverrides: assignment.taskOverrides } }
  );

  // Log audit entry
  await logAudit({
    actor: user,
    entityType: "Assignment",
    entityId: assignment._id,
    action: "NOT_REQUIRED",
    before: { taskKey, status: "pending" },
    after: { taskKey, status: "not_required", reason: reason.trim(), timestamp: now },
  });

  // Re-evaluate round completion
  return await getFamilyWorkflow(assignmentId, user);
}

/**
 * Get or provision a shared StakeholderTask for a family's linked stakeholder.
 * Reuses existing stakeholder records and tasks across households.
 */
export async function getOrCreateLinkedStakeholderTask({ assignmentId, taskKey, stakeholderId = null, user }) {
  await connectToDatabase();

  const assignment = await verifyAssignmentAccess(assignmentId, user);
  const family = assignment.family;
  const project = assignment.project;
  const round = assignment.surveyRound;

  let stakeholderType = "";
  let stakeholder = null;

  if (stakeholderId) {
    stakeholder = await Stakeholder.findById(stakeholderId);
    if (!stakeholder) {
      const err = new Error("Selected stakeholder not found.");
      err.statusCode = 404;
      throw err;
    }
    stakeholderType = stakeholder.stakeholderType;
    if (taskKey === "asha" && family && family._id) {
      await Family.updateOne({ _id: family._id }, { $set: { asha: stakeholder._id } });
    }
  } else if (taskKey === "asha") {
    stakeholderType = "asha";
    if (family?.asha) {
      stakeholder = await Stakeholder.findById(family.asha);
    }
    if (!stakeholder && family?.village) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "asha",
        $or: [{ village: family.village }, { villageId: family.village }],
        status: "active",
      });
    }
    if (!stakeholder && family?.mandal) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "asha",
        $or: [{ mandalId: family.mandal }, { mandal: family.mandal }],
        status: "active",
      });
    }
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "asha",
        status: "active",
      });
    }
  } else if (taskKey === "facility_staff") {
    stakeholderType = "facility_staff";
    const facilityId = assignment.facility?._id || assignment.facility || family?.facility;
    if (facilityId) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "facility_staff",
        $or: [{ facilityId: facilityId }, { facility: facilityId }],
        status: "active",
      });
    }
    if (!stakeholder && family?.mandal) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "facility_staff",
        $or: [{ mandalId: family.mandal }, { mandal: family.mandal }],
        status: "active",
      });
    }
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "facility_staff",
        status: "active",
      });
    }
  } else if (taskKey === "govt_official") {
    stakeholderType = "government_official";
    if (family?.mandal) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "government_official",
        mandalId: family.mandal,
        status: "active",
      });
    }
    if (!stakeholder) {
      stakeholder = await Stakeholder.findOne({
        projectId: project._id,
        stakeholderType: "government_official",
        status: "active",
      });
    }
  } else if (taskKey === "light_touch") {
    if (!round.enableLightTouch) {
      const err = new Error("Light-touch survey is not enabled for this round.");
      err.statusCode = 400;
      throw err;
    }
    // Return direct route to family light-touch
    return {
      taskType: "family",
      url: `/field/survey/${assignment._id}?type=family&category=light_touch`,
      isDirectFamilySurvey: true,
    };
  }

  if (!stakeholder) {
    const err = new Error(`No active ${stakeholderType.replace("_", " ")} stakeholder registered in this catchment area.`);
    err.statusCode = 404;
    throw err;
  }

  // Clear any existing not_required override on the assignment for this taskKey so the interview becomes active
  if (assignment.taskOverrides && assignment.taskOverrides.length > 0) {
    const prevLen = assignment.taskOverrides.length;
    assignment.taskOverrides = assignment.taskOverrides.filter((o) => o.taskKey !== taskKey);
    if (assignment.taskOverrides.length !== prevLen) {
      await Assignment.updateOne(
        { _id: assignment._id },
        { $set: { taskOverrides: assignment.taskOverrides } }
      );
    }
  }

  // Prevent duplicate interview tasks: reuse existing if already created!
  let task = await StakeholderTask.findOne({
    project: project._id,
    surveyRound: round._id,
    stakeholder: stakeholder._id,
    category: taskKey,
    status: { $in: ["assigned", "pending", "in_progress", "completed"] },
  });

  if (task) {
    return {
      taskId: task._id.toString(),
      taskCode: task.taskCode,
      status: task.status,
      reused: true,
      url: `/field/survey/${task._id}?type=stakeholder`,
      stakeholder: {
        id: stakeholder._id.toString(),
        name: stakeholder.fullName,
        designation: stakeholder.designation,
        phone: stakeholder.phone,
      },
    };
  }

  // Auto-provision task for the field worker
  const seq = await Counter.getNextSequence("stakeholder_task_code");
  const taskCode = `STK-${String(seq).padStart(5, "0")}`;

  task = await StakeholderTask.create({
    taskCode,
    project: project._id,
    surveyRound: round._id,
    stakeholder: stakeholder._id,
    category: taskKey,
    fieldWorker: user.id,
    status: "assigned",
    assignedAt: new Date(),
    createdBy: user.id,
  });

  await logAudit({
    actor: user,
    entityType: "StakeholderTask",
    entityId: task._id,
    action: "CREATE",
    after: {
      taskCode,
      project: project._id,
      surveyRound: round._id,
      stakeholder: stakeholder._id,
      category: taskKey,
      fieldWorker: user.id,
      note: `Auto-linked from Family ${family?.familyCode || "Household"} Workflow`,
    },
  });

  return {
    taskId: task._id.toString(),
    taskCode: task.taskCode,
    status: task.status,
    created: true,
    url: `/field/survey/${task._id}?type=stakeholder`,
    stakeholder: {
      id: stakeholder._id.toString(),
      name: stakeholder.fullName,
      designation: stakeholder.designation,
      phone: stakeholder.phone,
    },
  };
}

/**
 * Re-evaluates and persists round completion for a family assignment.
 */
export async function evaluateFamilyRoundCompletion(assignmentId) {
  await connectToDatabase();
  const assignment = await Assignment.findById(assignmentId)
    .populate("project")
    .populate("surveyRound")
    .populate("family");

  if (!assignment) return null;

  // Run full evaluation
  return await getFamilyWorkflow(assignmentId, { id: assignment.fieldWorker, role: "field_worker" });
}

/**
 * List assignments for the authenticated field worker enriched with family-linked workflow statuses.
 */
export async function getFamilyWorkflowList(workerUser, { page = 1, limit = 15, status = "", search = "", roundId = "" } = {}) {
  await connectToDatabase();

  const workerIdFilter =
    workerUser.role === "field_worker"
      ? (mongoose.Types.ObjectId.isValid(workerUser.id)
          ? { $in: [new mongoose.Types.ObjectId(workerUser.id), workerUser.id.toString()] }
          : workerUser.id)
      : null;

  const query = {};
  if (workerIdFilter) {
    query.fieldWorker = workerIdFilter;
  }
  query.status = { $ne: "cancelled" };

  if (roundId && mongoose.Types.ObjectId.isValid(roundId)) {
    query.surveyRound = roundId;
  }

  if (status) {
    if (status === "pending") {
      query.roundStatus = "pending";
    } else if (status === "in_progress") {
      query.roundStatus = "in_progress";
    } else if (status === "completed") {
      query.roundStatus = "completed";
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  // Fetch assignments with population
  const [totalCount, assignments] = await Promise.all([
    Assignment.countDocuments(query),
    Assignment.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code targetTiming enableLightTouch")
      .populate("family", "familyCode householdHeadName village mandal facility asha")
      .populate("village", "name code")
      .populate("mandal", "name code")
      .populate("facility", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  // Compute live workflow summary for each
  const items = [];
  for (const asg of assignments) {
    try {
      const wf = await getFamilyWorkflow(asg._id, workerUser);
      items.push(wf);
    } catch {
      // Fallback safe item
      items.push({
        assignment: {
          id: asg._id.toString(),
          assignmentCode: asg.assignmentCode,
          status: asg.status,
          roundStatus: asg.roundStatus || "pending",
        },
        family: {
          familyCode: asg.family?.familyCode || "",
          householdHeadName: asg.family?.householdHeadName || "",
          village: asg.village?.name || "",
          mandal: asg.mandal?.name || "",
          facility: asg.facility?.name || "",
        },
        surveyRound: asg.surveyRound,
        tasks: [],
        nextTask: null,
        isRoundCompleted: asg.roundStatus === "completed",
      });
    }
  }

  // Live round status counts
  const workerFilter = workerIdFilter ? { fieldWorker: workerIdFilter } : {};

  const [total, pendingCount, inProgressCount, completedCount] = await Promise.all([
    Assignment.countDocuments({ ...workerFilter, status: { $ne: "cancelled" } }),
    Assignment.countDocuments({ ...workerFilter, status: { $ne: "cancelled" }, roundStatus: "pending" }),
    Assignment.countDocuments({ ...workerFilter, status: { $ne: "cancelled" }, roundStatus: "in_progress" }),
    Assignment.countDocuments({ ...workerFilter, status: { $ne: "cancelled" }, roundStatus: "completed" }),
  ]);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
    },
    counts: {
      total,
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
    },
  };
}
