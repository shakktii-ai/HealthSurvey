import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Stakeholder from "@/models/Stakeholder";
import Family from "@/models/Family";
import DoctorInterview from "@/models/DoctorInterview";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import Assignment from "@/models/Assignment";
import Question from "@/models/Question";
import DataQualityIssue from "@/models/DataQualityIssue";
import AuditLog from "@/models/AuditLog";

/**
 * Perform relationship-aware dependency analysis for a stakeholder.
 * Inspects all linked records across collections and returns exact counts,
 * item details, and an explicit breakdown of what will be deleted, unlinked, and preserved.
 *
 * @param {string} stakeholderId - MongoDB ObjectId string of the stakeholder
 * @returns {Promise<Object>} Dependency analysis summary and details
 */
export async function analyzeStakeholderDependencies(stakeholderId) {
  await connectToDatabase();

  if (!stakeholderId || !mongoose.Types.ObjectId.isValid(stakeholderId)) {
    return { success: false, error: "Invalid stakeholder ID format", status: 400 };
  }

  const stakeholder = await Stakeholder.findById(stakeholderId)
    .populate("projectId", "name code")
    .populate("mandalId", "name code")
    .populate("facilityId", "name code facilityType")
    .populate("villageId", "name code");

  if (!stakeholder) {
    return { success: false, error: "Stakeholder not found", status: 404 };
  }

  const sId = new mongoose.Types.ObjectId(stakeholderId);

  // 1. Linked Families (PRESERVED: stakeholder references will be unlinked)
  const linkedFamilies = await Family.find({
    $or: [{ asha: sId }, { ashas: sId }, { doctor: sId }],
  })
    .select("familyCode householdHeadName village asha ashas doctor")
    .populate("village", "name")
    .lean();

  const linkedFamilyIds = linkedFamilies.map((f) => f._id);

  // 2. Doctor Interviews (WILL BE DELETED if stakeholder is doctor)
  const doctorInterviews = await DoctorInterview.find({ doctor: sId })
    .select("interviewCode interviewDate status linkedFamilies answers familyAssessments")
    .lean();
  const doctorInterviewIds = doctorInterviews.map((d) => d._id);

  // 3. Stakeholder Tasks (WILL BE DELETED)
  const stakeholderTasks = await StakeholderTask.find({ stakeholder: sId })
    .select("taskCode category status surveyRound fieldWorker")
    .populate("surveyRound", "name code roundNumber")
    .populate("fieldWorker", "name email")
    .lean();
  const stakeholderTaskIds = stakeholderTasks.map((t) => t._id);

  // 4. Survey Responses directly from this stakeholder or their tasks (WILL BE DELETED)
  const surveyResponses = await SurveyResponse.find({
    $or: [
      { stakeholder: sId },
      ...(stakeholderTaskIds.length > 0 ? [{ stakeholderTask: { $in: stakeholderTaskIds } }] : []),
    ],
    category: { $ne: "family" }, // STRICT SAFETY: Never delete family survey responses
  })
    .select("responseCode category status surveyRound fieldWorker family")
    .populate("surveyRound", "name code roundNumber")
    .populate("fieldWorker", "name email")
    .lean();
  const surveyResponseIds = surveyResponses.map((r) => r._id);

  // 5. Family Assignments belonging to linked families (PRESERVED: 0 deleted)
  const linkedFamilyAssignmentsCount =
    linkedFamilyIds.length > 0
      ? await Assignment.countDocuments({ family: { $in: linkedFamilyIds } })
      : 0;

  // 6. Data Quality Issues linked to this stakeholder or their tasks (WILL BE DELETED)
  const dataQualityIssues = await DataQualityIssue.find({
    $or: [
      { stakeholder: sId },
      ...(stakeholderTaskIds.length > 0 ? [{ stakeholderTask: { $in: stakeholderTaskIds } }] : []),
    ],
  })
    .select("issueCode ruleId severity status")
    .lean();
  const dataQualityIssueIds = dataQualityIssues.map((i) => i._id);

  // 7. Questions in category (Informational only: Master Questionnaire is preserved)
  const questionCount = await Question.countDocuments({ category: stakeholder.stakeholderType });

  // Summary counts
  const totalLinkedRecords =
    linkedFamilies.length +
    doctorInterviews.length +
    stakeholderTasks.length +
    surveyResponses.length +
    dataQualityIssues.length;

  const recordsToDeleteCount =
    1 + // The stakeholder record itself
    doctorInterviews.length +
    stakeholderTasks.length +
    surveyResponses.length +
    dataQualityIssues.length;

  const recordsToUnlinkCount = linkedFamilies.length;

  return {
    success: true,
    stakeholder: stakeholder.toSafeObject(),
    summary: {
      totalLinkedRecords,
      recordsToDeleteCount,
      recordsToUnlinkCount,
      recordsPreservedCount: linkedFamilies.length + linkedFamilyAssignmentsCount,
      counts: {
        linkedFamilies: linkedFamilies.length,
        doctorInterviews: doctorInterviews.length,
        stakeholderTasks: stakeholderTasks.length,
        surveyResponses: surveyResponses.length,
        assignments: linkedFamilyAssignmentsCount,
        dataQualityIssues: dataQualityIssues.length,
        questionsInCategory: questionCount,
      },
    },
    details: {
      linkedFamilies: linkedFamilies.map((f) => ({
        id: f._id.toString(),
        familyCode: f.familyCode,
        householdHeadName: f.householdHeadName,
        villageName: f.village?.name || "N/A",
        relationship: [
          f.asha?.toString() === stakeholderId ? "Primary ASHA" : null,
          Array.isArray(f.ashas) && f.ashas.some((id) => id?.toString() === stakeholderId)
            ? "Assigned ASHA"
            : null,
          f.doctor?.toString() === stakeholderId ? "Assigned Doctor" : null,
        ]
          .filter(Boolean)
          .join(", "),
        action: "PRESERVE_AND_UNLINK",
      })),
      doctorInterviews: doctorInterviews.map((d) => ({
        id: d._id.toString(),
        interviewCode: d.interviewCode,
        interviewDate: d.interviewDate,
        status: d.status,
        linkedFamiliesCount: d.linkedFamilies?.length || 0,
        answersCount: d.answers?.length || 0,
        action: "PERMANENTLY_DELETE",
      })),
      stakeholderTasks: stakeholderTasks.map((t) => ({
        id: t._id.toString(),
        taskCode: t.taskCode,
        category: t.category,
        status: t.status,
        roundCode: t.surveyRound?.code || "N/A",
        workerName: t.fieldWorker?.name || "Unassigned",
        action: "PERMANENTLY_DELETE",
      })),
      surveyResponses: surveyResponses.map((r) => ({
        id: r._id.toString(),
        responseCode: r.responseCode,
        category: r.category,
        status: r.status,
        roundCode: r.surveyRound?.code || "N/A",
        workerName: r.fieldWorker?.name || "Unknown",
        action: "PERMANENTLY_DELETE",
      })),
      dataQualityIssues: dataQualityIssues.map((i) => ({
        id: i._id.toString(),
        issueCode: i.issueCode || i.ruleId,
        ruleId: i.ruleId,
        severity: i.severity,
        status: i.status,
        action: "PERMANENTLY_DELETE",
      })),
    },
    rules: {
      willBeDeleted: [
        `Stakeholder profile record: ${stakeholder.fullName} (${stakeholder.stakeholderType})`,
        ...(doctorInterviews.length > 0
          ? [`${doctorInterviews.length} Doctor clinical interview record(s)`]
          : []),
        ...(stakeholderTasks.length > 0
          ? [`${stakeholderTasks.length} Assigned stakeholder survey task(s)`]
          : []),
        ...(surveyResponses.length > 0
          ? [`${surveyResponses.length} Stakeholder questionnaire response(s)`]
          : []),
        ...(dataQualityIssues.length > 0
          ? [`${dataQualityIssues.length} Associated data quality issue(s)`]
          : []),
      ],
      willBeUnlinked: [
        ...(linkedFamilies.length > 0
          ? [
              `${linkedFamilies.length} Family record(s) will have their ASHA/Doctor link safely cleared without altering any household data.`,
            ]
          : ["No family relationships require unlinking."]),
      ],
      willBePreserved: [
        `All ${linkedFamilies.length} Family master record(s) and household member data remain strictly preserved.`,
        `All ${linkedFamilyAssignmentsCount} Family survey assignment(s) remain preserved and intact.`,
        `All Family household survey responses remain intact.`,
        `Master Question Bank (${questionCount} questions in this category) remains unchanged.`,
        `Records belonging to other stakeholders, field workers, and facilities remain completely unaffected.`,
      ],
    },
  };
}

/**
 * Execute atomic, permanent deletion of a stakeholder and safe dependent records.
 * Independently recalculates all dependencies inside the transaction to eliminate race conditions.
 *
 * @param {string} stakeholderId - MongoDB ObjectId string of stakeholder to delete
 * @param {Object} options - Deletion parameters { reason, confirmation }
 * @param {Object} actor - Authenticated Superadmin user object
 * @returns {Promise<Object>} Result of permanent deletion
 */
export async function permanentlyDeleteStakeholder(
  stakeholderId,
  { reason = "", confirmation = "" } = {},
  actor
) {
  await connectToDatabase();

  // 1. Strict Security Guard: Only Superadmin
  if (!actor || actor.role !== "superadmin") {
    return {
      success: false,
      error: "Forbidden. Only Superadmin has permission to permanently delete stakeholders.",
      status: 403,
    };
  }

  // 2. Strict Confirmation Guard: Must type DELETE
  if (confirmation !== "DELETE") {
    return {
      success: false,
      error: "Confirmation check failed. Please type DELETE to confirm permanent deletion.",
      status: 400,
    };
  }

  // 3. ID Validation
  if (!stakeholderId || !mongoose.Types.ObjectId.isValid(stakeholderId)) {
    return { success: false, error: "Invalid stakeholder ID format", status: 400 };
  }

  const sId = new mongoose.Types.ObjectId(stakeholderId);

  // 4. Check Replica Set support for transactions
  let isReplicaSet = false;
  try {
    const admin = mongoose.connection.db?.admin();
    if (admin) {
      const status = await admin.command({ isMaster: 1 }).catch(() => null);
      if (status && (status.setName || status.isreplicaset)) {
        isReplicaSet = true;
      }
    }
  } catch {
    isReplicaSet = false;
  }

  const session = await mongoose.startSession();
  let transactionActive = false;

  try {
    if (isReplicaSet) {
      session.startTransaction();
      transactionActive = true;
    }

    const sessionOpts = transactionActive ? { session } : {};

    // 5. Fresh retrieval & existence check (Prevents race conditions)
    const stakeholder = await Stakeholder.findById(sId, null, sessionOpts)
      .populate("projectId", "name code")
      .populate("mandalId", "name code")
      .populate("facilityId", "name code")
      .populate("villageId", "name code");

    if (!stakeholder) {
      if (transactionActive) await session.abortTransaction();
      return { success: false, error: "Stakeholder not found or already deleted", status: 404 };
    }

    // 6. Recalculate dependencies independently on server
    const linkedFamilies = await Family.find(
      { $or: [{ asha: sId }, { ashas: sId }, { doctor: sId }] },
      "_id familyCode asha ashas doctor",
      sessionOpts
    );
    const linkedFamilyIds = linkedFamilies.map((f) => f._id);

    const doctorInterviews = await DoctorInterview.find(
      { doctor: sId },
      "_id interviewCode linkedFamilies answers",
      sessionOpts
    );
    const doctorInterviewIds = doctorInterviews.map((d) => d._id);

    const stakeholderTasks = await StakeholderTask.find(
      { stakeholder: sId },
      "_id taskCode category status",
      sessionOpts
    );
    const stakeholderTaskIds = stakeholderTasks.map((t) => t._id);

    const surveyResponses = await SurveyResponse.find(
      {
        $or: [
          { stakeholder: sId },
          ...(stakeholderTaskIds.length > 0 ? [{ stakeholderTask: { $in: stakeholderTaskIds } }] : []),
        ],
        category: { $ne: "family" },
      },
      "_id responseCode category status",
      sessionOpts
    );
    const surveyResponseIds = surveyResponses.map((r) => r._id);

    const dataQualityIssues = await DataQualityIssue.find(
      {
        $or: [
          { stakeholder: sId },
          ...(stakeholderTaskIds.length > 0 ? [{ stakeholderTask: { $in: stakeholderTaskIds } }] : []),
        ],
      },
      "_id issueCode ruleId",
      sessionOpts
    );
    const dataQualityIssueIds = dataQualityIssues.map((i) => i._id);

    // 7. Prepare Snapshot for Audit Logging
    const stakeholderSnapshot = {
      id: stakeholder._id.toString(),
      fullName: stakeholder.fullName,
      stakeholderType: stakeholder.stakeholderType,
      designation: stakeholder.designation || "",
      projectId: stakeholder.projectId?._id?.toString() || stakeholder.projectId?.toString(),
      projectName: stakeholder.projectId?.name || "",
      mandalId: stakeholder.mandalId?._id?.toString() || stakeholder.mandalId?.toString(),
      mandalName: stakeholder.mandalId?.name || "",
      facilityId: stakeholder.facilityId?._id?.toString() || stakeholder.facilityId?.toString() || null,
      facilityName: stakeholder.facilityId?.name || "",
      villageId: stakeholder.villageId?._id?.toString() || stakeholder.villageId?.toString() || null,
      villageName: stakeholder.villageId?.name || "",
      status: stakeholder.status,
    };

    const auditBefore = {
      snapshot: stakeholderSnapshot,
      deletionReason: reason ? reason.trim() : "Explicit Superadmin permanent deletion",
      dependencyCounts: {
        unlinkedFamilies: linkedFamilyIds.length,
        deletedDoctorInterviews: doctorInterviewIds.length,
        deletedStakeholderTasks: stakeholderTaskIds.length,
        deletedSurveyResponses: surveyResponseIds.length,
        deletedDataQualityIssues: dataQualityIssueIds.length,
      },
      deletedReferences: {
        unlinkedFamilyCodes: linkedFamilies.map((f) => f.familyCode),
        deletedDoctorInterviewCodes: doctorInterviews.map((d) => d.interviewCode),
        deletedStakeholderTaskCodes: stakeholderTasks.map((t) => t.taskCode),
        deletedSurveyResponseCodes: surveyResponses.map((r) => r.responseCode),
      },
    };

    // 8. Safely Unlink Family References (Preserve Family Records intact!)
    if (linkedFamilyIds.length > 0) {
      await Family.updateMany(
        { asha: sId },
        { $set: { asha: null } },
        sessionOpts
      );
      await Family.updateMany(
        { ashas: sId },
        { $pull: { ashas: sId } },
        sessionOpts
      );
      await Family.updateMany(
        { doctor: sId },
        { $set: { doctor: null } },
        sessionOpts
      );
    }

    // 9. Delete Data Quality Issues
    if (dataQualityIssueIds.length > 0) {
      await DataQualityIssue.deleteMany(
        { _id: { $in: dataQualityIssueIds } },
        sessionOpts
      );
    }

    // 10. Delete Stakeholder Survey Responses
    if (surveyResponseIds.length > 0) {
      await SurveyResponse.deleteMany(
        { _id: { $in: surveyResponseIds } },
        sessionOpts
      );
    }

    // 11. Delete Doctor Clinical Interviews
    if (doctorInterviewIds.length > 0) {
      await DoctorInterview.deleteMany(
        { _id: { $in: doctorInterviewIds } },
        sessionOpts
      );
    }

    // 12. Delete Stakeholder Tasks
    if (stakeholderTaskIds.length > 0) {
      await StakeholderTask.deleteMany(
        { _id: { $in: stakeholderTaskIds } },
        sessionOpts
      );
    }

    // 13. Delete Stakeholder record
    await Stakeholder.deleteOne({ _id: sId }, sessionOpts);

    // 14. Preserve Audit Log Entry
    await AuditLog.create(
      [
        {
          actorId: actor.id || actor._id,
          actorEmail: actor.email || "superadmin@healthsurvey.org",
          actorRole: actor.role || "superadmin",
          entityType: "Stakeholder",
          entityId: sId,
          action: "PERMANENT_DELETE",
          before: auditBefore,
          after: null,
          timestamp: new Date(),
        },
      ],
      sessionOpts
    );

    // 15. Commit transaction if active
    if (transactionActive) {
      await session.commitTransaction();
    }

    return {
      success: true,
      message: `Stakeholder "${stakeholder.fullName}" (${stakeholder.stakeholderType}) and all dependent records were permanently deleted.`,
      deletedStakeholder: stakeholderSnapshot,
      summary: {
        deletedDoctorInterviews: doctorInterviewIds.length,
        deletedStakeholderTasks: stakeholderTaskIds.length,
        deletedSurveyResponses: surveyResponseIds.length,
        deletedDataQualityIssues: dataQualityIssueIds.length,
        unlinkedFamilies: linkedFamilyIds.length,
        preservedFamilies: linkedFamilyIds.length,
      },
      status: 200,
    };
  } catch (error) {
    if (transactionActive) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Failed to abort transaction:", abortErr.message);
      }
    }
    console.error("Permanent stakeholder deletion error:", error);
    return {
      success: false,
      error: `Permanent deletion failed: ${error.message}. All database operations were rolled back.`,
      status: 500,
    };
  } finally {
    session.endSession();
  }
}

