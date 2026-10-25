import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import DoctorInterview from "@/models/DoctorInterview";
import Stakeholder from "@/models/Stakeholder";
import Project from "@/models/Project";
import Facility from "@/models/Facility";
import Mandal from "@/models/Mandal";
import Family from "@/models/Family";
import SurveyRound from "@/models/SurveyRound";
import Counter from "@/models/Counter";
import { logAudit } from "@/lib/audit";

/**
 * Generate atomic unique Doctor Interview Code: DOC-INT-00001
 */
async function generateInterviewCode() {
  const seq = await Counter.getNextSequence("doctor_interview_code");
  return `DOC-INT-${seq.toString().padStart(5, "0")}`;
}

/**
 * Create a new Doctor Interview record.
 */
export async function createDoctorInterview(data, actor) {
  await connectToDatabase();

  const {
    doctorId,
    projectId,
    facilityId,
    mandalId,
    surveyRoundId = null,
    interviewDate = new Date(),
    status = "draft",
    notes = "",
    completionNotes = "",
    answers = [],
    linkedFamilyIds = [],
  } = data;

  if (!doctorId) {
    return { success: false, error: "Doctor reference is required", status: 400 };
  }
  if (!projectId) {
    return { success: false, error: "Project reference is required", status: 400 };
  }
  if (!facilityId) {
    return { success: false, error: "Healthcare facility reference is required", status: 400 };
  }

  // 1. Validate Doctor Stakeholder
  const doctor = await Stakeholder.findById(doctorId);
  if (!doctor || doctor.status !== "active") {
    return { success: false, error: "Selected doctor is invalid or inactive", status: 400 };
  }
  if (!["doctor", "facility_staff"].includes(doctor.stakeholderType)) {
    return { success: false, error: "Selected stakeholder is not a doctor or medical officer", status: 400 };
  }

  // 2. Validate Project & Facility
  const [project, facility] = await Promise.all([
    Project.findById(projectId),
    Facility.findById(facilityId),
  ]);

  if (!project || project.status !== "active") {
    return { success: false, error: "Selected project is invalid or inactive", status: 400 };
  }
  if (!facility || facility.status !== "active") {
    return { success: false, error: "Selected facility is invalid or inactive", status: 400 };
  }
  if (facility.projectId && facility.projectId.toString() !== projectId) {
    return { success: false, error: "Selected facility does not belong to the selected project", status: 400 };
  }

  // 3. Optional Survey Round Validation
  let surveyRound = null;
  if (surveyRoundId) {
    surveyRound = await SurveyRound.findById(surveyRoundId);
    if (!surveyRound || surveyRound.status === "archived") {
      return { success: false, error: "Selected survey round is invalid or archived", status: 400 };
    }
  }

  // Derived Mandal
  const resolvedMandalId = mandalId || facility.mandalId || doctor.mandalId || null;

  // 4. Validate initial linked families (if any)
  const validFamilyIds = [];
  if (Array.isArray(linkedFamilyIds) && linkedFamilyIds.length > 0) {
    const uniqueIds = [...new Set(linkedFamilyIds.filter(Boolean))];
    for (const famId of uniqueIds) {
      const fam = await Family.findById(famId);
      if (!fam) {
        return { success: false, error: `Linked family '${famId}' not found`, status: 404 };
      }
      if (fam.project.toString() !== projectId) {
        return {
          success: false,
          error: `Family '${fam.familyCode}' belongs to a different project (${fam.project}). Linking rejected.`,
          status: 400,
        };
      }
      if (fam.facility.toString() !== facilityId) {
        return {
          success: false,
          error: `Family '${fam.familyCode}' belongs to a different facility (${fam.facility}). Linking rejected.`,
          status: 400,
        };
      }
      validFamilyIds.push(fam._id);
    }
  }

  // 5. Generate Atomic Code & Create Interview
  let interviewCode = "";
  let interview = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (!interview && attempts < maxAttempts) {
    attempts++;
    interviewCode = await generateInterviewCode();

    try {
      interview = await DoctorInterview.create({
        interviewCode,
        doctor: doctorId,
        project: projectId,
        facility: facilityId,
        mandal: resolvedMandalId,
        surveyRound: surveyRoundId || null,
        interviewDate: new Date(interviewDate),
        interviewer: actor.id || actor._id,
        status: ["draft", "in_progress", "completed"].includes(status) ? status : "draft",
        answers: Array.isArray(answers) ? answers : [],
        linkedFamilies: validFamilyIds,
        notes: notes ? notes.trim() : "",
        completionNotes: completionNotes ? completionNotes.trim() : "",
        startedAt: new Date(),
        completedAt: status === "completed" ? new Date() : null,
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.interviewCode) {
        interview = null;
      } else {
        throw err;
      }
    }
  }

  if (!interview) {
    return { success: false, error: "Failed to generate unique interview code after multiple attempts", status: 500 };
  }

  await interview.populate([
    { path: "doctor", select: "fullName designation phone stakeholderType" },
    { path: "facility", select: "name code facilityType" },
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "surveyRound", select: "name code" },
    { path: "interviewer", select: "name email role" },
    {
      path: "linkedFamilies",
      select: "familyCode householdHeadName phoneNumber village",
      populate: { path: "village", select: "name code" },
    },
  ]);

  await logAudit({
    actor,
    entityType: "DoctorInterview",
    entityId: interview._id,
    action: "CREATE",
    after: interview,
  });

  return { success: true, item: interview.toSafeObject(), status: 201 };
}

/**
 * List Doctor Interviews with filtering, search, and pagination.
 */
export async function listDoctorInterviews({
  projectId = "",
  facilityId = "",
  doctorId = "",
  status = "",
  search = "",
  page = 1,
  limit = 15,
  actor = null,
} = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.project = projectId;
  if (facilityId) query.facility = facilityId;
  if (doctorId) query.doctor = doctorId;
  if (status) query.status = status;

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ interviewCode: regex }, { notes: regex }];
  }

  const numericLimit = Math.max(1, Math.min(100, Number(limit) || 15));
  const numericPage = Math.max(1, Number(page) || 1);
  const skip = (numericPage - 1) * numericLimit;

  const [total, interviews] = await Promise.all([
    DoctorInterview.countDocuments(query),
    DoctorInterview.find(query)
      .sort({ interviewDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate("doctor", "fullName designation phone stakeholderType")
      .populate("facility", "name code facilityType")
      .populate("project", "name code")
      .populate("mandal", "name code")
      .populate("surveyRound", "name code")
      .populate("interviewer", "name email role")
      .populate({
        path: "linkedFamilies",
        select: "familyCode householdHeadName phoneNumber village",
        populate: { path: "village", select: "name code" },
      }),
  ]);

  return {
    items: interviews.map((inv) => inv.toSafeObject()),
    total,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(total / numericLimit) || 1,
  };
}

/**
 * Get single Doctor Interview by ID.
 */
export async function getDoctorInterviewById(id) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const interview = await DoctorInterview.findById(id)
    .populate("doctor", "fullName designation phone stakeholderType")
    .populate("facility", "name code facilityType")
    .populate("project", "name code")
    .populate("mandal", "name code")
    .populate("surveyRound", "name code")
    .populate("interviewer", "name email role")
    .populate({
      path: "linkedFamilies",
      select: "familyCode householdHeadName phoneNumber village mandal facility",
      populate: [
        { path: "village", select: "name code" },
        { path: "facility", select: "name code" },
        { path: "asha", select: "fullName designation phone" },
      ],
    });

  return interview ? interview.toSafeObject() : null;
}

/**
 * Update an existing Doctor Interview.
 */
export async function updateDoctorInterview(id, updates, actor) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid interview ID", status: 400 };
  }

  const interview = await DoctorInterview.findById(id);
  if (!interview) {
    return { success: false, error: "Doctor interview not found", status: 404 };
  }

  const before = interview.toObject();

  if (updates.interviewDate) {
    interview.interviewDate = new Date(updates.interviewDate);
  }
  if (updates.status && ["draft", "in_progress", "completed"].includes(updates.status)) {
    interview.status = updates.status;
    if (updates.status === "completed" && !interview.completedAt) {
      interview.completedAt = new Date();
    }
  }
  if (updates.notes !== undefined) {
    interview.notes = updates.notes ? updates.notes.trim() : "";
  }
  if (updates.completionNotes !== undefined) {
    interview.completionNotes = updates.completionNotes ? updates.completionNotes.trim() : "";
  }
  if (Array.isArray(updates.answers)) {
    interview.answers = updates.answers;
  }
  if (Array.isArray(updates.familyAssessments)) {
    interview.familyAssessments = updates.familyAssessments;
  }

  await interview.save();

  await interview.populate([
    { path: "doctor", select: "fullName designation phone stakeholderType" },
    { path: "facility", select: "name code facilityType" },
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "surveyRound", select: "name code" },
    { path: "interviewer", select: "name email role" },
    {
      path: "linkedFamilies",
      select: "familyCode householdHeadName phoneNumber village",
      populate: { path: "village", select: "name code" },
    },
  ]);

  await logAudit({
    actor,
    entityType: "DoctorInterview",
    entityId: interview._id,
    action: "UPDATE",
    before,
    after: interview,
  });

  return { success: true, item: interview.toSafeObject(), status: 200 };
}

/**
 * Link one or multiple families/patients to a Doctor Interview.
 * Performs strict server-side validation against project and facility compatibility.
 */
export async function linkFamiliesToDoctorInterview(interviewId, familyIds, actor) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(interviewId)) {
    return { success: false, error: "Invalid interview ID", status: 400 };
  }

  const interview = await DoctorInterview.findById(interviewId);
  if (!interview) {
    return { success: false, error: "Doctor interview not found", status: 404 };
  }

  // Ensure Doctor exists and is active
  const doctor = await Stakeholder.findById(interview.doctor);
  if (!doctor || doctor.status !== "active") {
    return { success: false, error: "Associated doctor is inactive or missing", status: 400 };
  }

  const rawIds = Array.isArray(familyIds) ? familyIds : [familyIds];
  const targetIds = [...new Set(rawIds.filter((id) => mongoose.Types.ObjectId.isValid(id)))];

  if (targetIds.length === 0) {
    return { success: false, error: "At least one valid family ID must be provided to link", status: 400 };
  }

  const currentLinkedSet = new Set(
    (interview.linkedFamilies || []).map((f) => f.toString())
  );

  const newlyLinkedIds = [];
  const alreadyLinkedCodes = [];

  for (const famId of targetIds) {
    if (currentLinkedSet.has(famId.toString())) {
      const existingFam = await Family.findById(famId, "familyCode").lean();
      alreadyLinkedCodes.push(existingFam?.familyCode || famId);
      continue;
    }

    const family = await Family.findById(famId).populate("facility", "name code");
    if (!family) {
      return { success: false, error: `Family record '${famId}' not found`, status: 404 };
    }
    if (family.status !== "active") {
      return { success: false, error: `Family '${family.familyCode}' is inactive. Cannot link.`, status: 400 };
    }

    // Context validation: Compatible Project
    if (family.project.toString() !== interview.project.toString()) {
      return {
        success: false,
        error: `Validation Error: Family '${family.familyCode}' belongs to a different project context. Linking rejected.`,
        status: 400,
      };
    }

    // Context validation: Compatible Facility
    if (family.facility?._id ? family.facility._id.toString() !== interview.facility.toString() : family.facility.toString() !== interview.facility.toString()) {
      const facName = family.facility?.name || "another facility";
      return {
        success: false,
        error: `Validation Error: Family '${family.familyCode}' is registered under catchment '${facName}', which does not match this interview's facility. Linking rejected.`,
        status: 400,
      };
    }

    newlyLinkedIds.push(family._id);
  }

  if (newlyLinkedIds.length === 0) {
    return {
      success: false,
      error: `All selected families (${alreadyLinkedCodes.join(", ")}) are already linked to this interview. No new links added.`,
      status: 409,
    };
  }

  interview.linkedFamilies.push(...newlyLinkedIds);
  await interview.save();

  await interview.populate([
    { path: "doctor", select: "fullName designation phone stakeholderType" },
    { path: "facility", select: "name code facilityType" },
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "surveyRound", select: "name code" },
    { path: "interviewer", select: "name email role" },
    {
      path: "linkedFamilies",
      select: "familyCode householdHeadName phoneNumber village",
      populate: { path: "village", select: "name code" },
    },
  ]);

  await logAudit({
    actor,
    entityType: "DoctorInterview",
    entityId: interview._id,
    action: "LINK_FAMILIES",
    details: { linkedFamilyCount: newlyLinkedIds.length, linkedFamilyIds: newlyLinkedIds },
  });

  return {
    success: true,
    message: `Successfully linked ${newlyLinkedIds.length} family record(s) to Doctor Interview ${interview.interviewCode}`,
    item: interview.toSafeObject(),
    status: 200,
  };
}

/**
 * Remove a linked family from a Doctor Interview.
 * Strictly guarantees that removing the link DOES NOT delete the Family or Interview record.
 */
export async function unlinkFamilyFromDoctorInterview(interviewId, familyId, actor) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(interviewId) || !mongoose.Types.ObjectId.isValid(familyId)) {
    return { success: false, error: "Invalid interview or family ID", status: 400 };
  }

  const interview = await DoctorInterview.findById(interviewId);
  if (!interview) {
    return { success: false, error: "Doctor interview not found", status: 404 };
  }

  const initialCount = interview.linkedFamilies.length;
  interview.linkedFamilies = interview.linkedFamilies.filter(
    (f) => f.toString() !== familyId.toString()
  );

  if (interview.linkedFamilies.length === initialCount) {
    return { success: false, error: "Specified family is not linked to this interview", status: 404 };
  }

  await interview.save();

  await interview.populate([
    { path: "doctor", select: "fullName designation phone stakeholderType" },
    { path: "facility", select: "name code facilityType" },
    { path: "project", select: "name code" },
    { path: "mandal", select: "name code" },
    { path: "surveyRound", select: "name code" },
    { path: "interviewer", select: "name email role" },
    {
      path: "linkedFamilies",
      select: "familyCode householdHeadName phoneNumber village",
      populate: { path: "village", select: "name code" },
    },
  ]);

  await logAudit({
    actor,
    entityType: "DoctorInterview",
    entityId: interview._id,
    action: "UNLINK_FAMILY",
    details: { unlinkedFamilyId: familyId },
  });

  return {
    success: true,
    message: "Family link removed successfully. Family and interview records are fully preserved.",
    item: interview.toSafeObject(),
    status: 200,
  };
}

/**
 * Query all Doctor Interviews linked to a specific family/patient.
 */
export async function getDoctorInterviewsForFamily(familyId) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(familyId)) return [];

  const interviews = await DoctorInterview.find({
    linkedFamilies: familyId,
  })
    .sort({ interviewDate: -1 })
    .populate("doctor", "fullName designation phone stakeholderType")
    .populate("facility", "name code facilityType")
    .populate("interviewer", "name email role")
    .populate("surveyRound", "name code");

  return interviews.map((inv) => inv.toSafeObject());
}
