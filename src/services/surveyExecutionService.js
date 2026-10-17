import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import Question from "@/models/Question";
import QuestionVersion from "@/models/QuestionVersion";
import SurveyRound from "@/models/SurveyRound";
import Family from "@/models/Family";
import Stakeholder from "@/models/Stakeholder";
import Counter from "@/models/Counter";
import { shouldDisplayQuestion } from "@/utils/conditionEvaluator";
import { logAudit } from "@/lib/audit";

/**
 * Helper to fetch and verify task ownership for an authenticated Field Worker.
 */
async function verifyTaskOwnership({ assignmentId = "", stakeholderTaskId = "" }, worker) {
  if (!assignmentId && !stakeholderTaskId) {
    const err = new Error("Either assignmentId or stakeholderTaskId must be provided");
    err.statusCode = 400;
    throw err;
  }

  let task = null;
  let taskType = "";

  if (assignmentId) {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      const err = new Error("Invalid Assignment ID");
      err.statusCode = 400;
      throw err;
    }
    task = await Assignment.findById(assignmentId)
      .populate("project", "name code")
      .populate("surveyRound", "name code enableLightTouch status")
      .populate("family", "familyCode householdHeadName village mandal facility status")
      .populate("village", "name code")
      .populate("mandal", "name code")
      .populate("facility", "name code");
    taskType = "family";
  } else {
    if (!mongoose.Types.ObjectId.isValid(stakeholderTaskId)) {
      const err = new Error("Invalid Stakeholder Task ID");
      err.statusCode = 400;
      throw err;
    }
    task = await StakeholderTask.findById(stakeholderTaskId)
      .populate("project", "name code")
      .populate("surveyRound", "name code enableLightTouch status")
      .populate("stakeholder", "fullName stakeholderType designation phone");
    taskType = "stakeholder";
  }

  if (!task) {
    const err = new Error("Task record not found");
    err.statusCode = 404;
    throw err;
  }

  // Ensure authenticated field worker owns this task (superadmin can preview/bypass)
  if (worker.role === "field_worker") {
    const assignedWorkerId = task.fieldWorker?.toString();
    if (assignedWorkerId !== worker.id.toString()) {
      const err = new Error("You are not authorized to execute this task. It is allocated to another field worker.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (task.status === "cancelled") {
    const err = new Error("This assignment has been cancelled and cannot be executed.");
    err.statusCode = 400;
    throw err;
  }

  return { task, taskType };
}

/**
 * 1. Load Questionnaire and Active Session for Field Worker
 */
export async function getExecutionSurveyData(
  { assignmentId = "", stakeholderTaskId = "", category = "" },
  worker
) {
  await connectToDatabase();

  const { task, taskType } = await verifyTaskOwnership(
    { assignmentId, stakeholderTaskId },
    worker
  );

  const projectId = task.project._id || task.project;
  const roundId = task.surveyRound._id || task.surveyRound;
  const targetCategory = category || (taskType === "family" ? "family" : task.category);

  // Verify light-touch category constraint
  if (targetCategory === "light_touch" && !task.surveyRound.enableLightTouch) {
    const err = new Error("Light-touch survey is not enabled for the selected survey round.");
    err.statusCode = 400;
    throw err;
  }

  // Fetch active questions applicable to this project, category, and round
  const questions = await Question.find({
    project: projectId,
    category: targetCategory,
    status: "active",
    rounds: roundId,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  // Fetch latest question versions to ensure accurate version tracking
  const questionIds = questions.map((q) => q._id);
  const versions = await QuestionVersion.find({
    questionId: { $in: questionIds },
  }).lean();

  const versionMap = new Map();
  for (const v of versions) {
    versionMap.set(`${v.questionId.toString()}_v${v.versionNumber}`, v);
  }

  // Attach version details
  const enrichedQuestions = questions.map((q) => {
    const versionKey = `${q._id.toString()}_v${q.currentVersion || 1}`;
    const verDoc = versionMap.get(versionKey);
    return {
      ...q,
      id: q._id.toString(),
      versionId: verDoc?._id ? verDoc._id.toString() : null,
      versionNumber: q.currentVersion || 1,
    };
  });

  // Query existing SurveyResponse if draft or submitted exists
  const responseQuery = assignmentId
    ? { assignment: assignmentId, category: targetCategory }
    : { stakeholderTask: stakeholderTaskId };

  const existingResponse = await SurveyResponse.findOne(responseQuery).lean();

  // Convert answers array to lookup map for frontend form
  const savedAnswers = {};
  if (existingResponse && Array.isArray(existingResponse.answers)) {
    for (const ans of existingResponse.answers) {
      savedAnswers[ans.questionCode] = ans.value;
    }
  }

  return {
    task: {
      id: task._id.toString(),
      type: taskType,
      code: task.assignmentCode || task.taskCode,
      status: task.status,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      family: task.family
        ? {
            id: task.family._id.toString(),
            familyCode: task.family.familyCode,
            householdHeadName: task.family.householdHeadName,
            village: task.village?.name || "",
            mandal: task.mandal?.name || "",
          }
        : null,
      stakeholder: task.stakeholder
        ? {
            id: task.stakeholder._id.toString(),
            fullName: task.stakeholder.fullName,
            type: task.stakeholder.stakeholderType,
            designation: task.stakeholder.designation,
          }
        : null,
    },
    project: {
      id: task.project._id.toString(),
      name: task.project.name,
      code: task.project.code,
    },
    surveyRound: {
      id: task.surveyRound._id.toString(),
      name: task.surveyRound.name,
      code: task.surveyRound.code,
      enableLightTouch: task.surveyRound.enableLightTouch,
    },
    category: targetCategory,
    questions: enrichedQuestions,
    response: existingResponse
      ? {
          id: existingResponse._id.toString(),
          responseCode: existingResponse.responseCode,
          status: existingResponse.status,
          language: existingResponse.language,
          startedAt: existingResponse.startedAt,
          lastSavedAt: existingResponse.lastSavedAt,
          submittedAt: existingResponse.submittedAt,
        }
      : null,
    savedAnswers,
    consent: existingResponse?.consent || {
      consentGiven: false,
      notes: "",
    },
    language: existingResponse?.language || "en",
  };
}

/**
 * 2. Save Survey Draft (Permissive, without strict validation)
 */
export async function saveSurveyDraft(
  {
    assignmentId = "",
    stakeholderTaskId = "",
    category = "",
    answers = {},
    consent = {},
    language = "en",
    respondentName = "",
    respondentType = "",
  },
  worker
) {
  await connectToDatabase();

  const { task, taskType } = await verifyTaskOwnership(
    { assignmentId, stakeholderTaskId },
    worker
  );

  const projectId = task.project._id || task.project;
  const roundId = task.surveyRound._id || task.surveyRound;
  const targetCategory = category || (taskType === "family" ? "family" : task.category);

  // Check existing response
  const responseQuery = assignmentId
    ? { assignment: assignmentId, category: targetCategory }
    : { stakeholderTask: stakeholderTaskId };

  let response = await SurveyResponse.findOne(responseQuery);

  if (response && response.status === "submitted") {
    const err = new Error("This survey has already been submitted and cannot be modified as a draft.");
    err.statusCode = 400;
    throw err;
  }

  // Load active questions to attach proper question metadata
  const questions = await Question.find({
    project: projectId,
    category: targetCategory,
    status: "active",
    rounds: roundId,
  }).lean();

  const questionsByCode = new Map(questions.map((q) => [q.code, q]));

  // Build answer snapshots array
  const answersArray = [];
  for (const [qCode, val] of Object.entries(answers)) {
    const qDoc = questionsByCode.get(qCode);
    if (qDoc && val !== undefined) {
      answersArray.push({
        questionId: qDoc._id,
        versionNumber: qDoc.currentVersion || 1,
        questionCode: qCode,
        answerType: qDoc.answerType,
        value: val,
        questionTextSnapshot: {
          en: qDoc.text?.en || "",
          te: qDoc.text?.te || "",
        },
      });
    }
  }

  const now = new Date();

  if (!response) {
    const seq = await Counter.getNextSequence("survey_response_code");
    const responseCode = `RES-${String(seq).padStart(5, "0")}`;

    response = await SurveyResponse.create({
      responseCode,
      project: projectId,
      surveyRound: roundId,
      category: targetCategory,
      assignment: assignmentId || null,
      stakeholderTask: stakeholderTaskId || null,
      family: task.family?._id || null,
      stakeholder: task.stakeholder?._id || null,
      fieldWorker: worker.id,
      respondentType: respondentType || (taskType === "family" ? "family_head" : task.stakeholder?.stakeholderType),
      respondentName: respondentName || (taskType === "family" ? task.family?.householdHeadName : task.stakeholder?.fullName),
      language,
      status: "draft",
      answers: answersArray,
      consent: {
        consentGiven: !!consent.consentGiven,
        consentTimestamp: consent.consentGiven ? now : null,
        consentLanguage: language,
        notes: consent.notes || "",
      },
      startedAt: now,
      lastSavedAt: now,
    });

    await logAudit({
      actor: worker,
      entityType: "SurveyResponse",
      entityId: response._id,
      action: "CREATE",
      after: {
        responseCode,
        category,
        status: "draft",
        taskType,
      },
    });
  } else {
    response.answers = answersArray;
    response.consent = {
      consentGiven: !!consent.consentGiven,
      consentTimestamp: consent.consentGiven ? response.consent.consentTimestamp || now : null,
      consentLanguage: language,
      notes: consent.notes || "",
    };
    response.language = language;
    response.lastSavedAt = now;
    if (respondentName) response.respondentName = respondentName;
    if (respondentType) response.respondentType = respondentType;
    await response.save();

    await logAudit({
      actor: worker,
      entityType: "SurveyResponse",
      entityId: response._id,
      action: "UPDATE",
      after: {
        responseCode: response.responseCode,
        status: "draft",
        lastSavedAt: now,
      },
    });
  }

  // If task status was 'assigned', automatically bump to 'in_progress'
  if (task.status === "assigned") {
    task.status = "in_progress";
    if (!task.startedAt) task.startedAt = now;
    await task.save();

    await logAudit({
      actor: worker,
      entityType: taskType === "family" ? "Assignment" : "StakeholderTask",
      entityId: task._id,
      action: "STATUS_CHANGE",
      before: { status: "assigned" },
      after: { status: "in_progress", startedAt: now },
    });
  }

  return {
    success: true,
    responseCode: response.responseCode,
    status: response.status,
    lastSavedAt: response.lastSavedAt,
    answersCount: answersArray.length,
    message: "Draft saved successfully",
  };
}

/**
 * 3. Submit Completed Survey (Strict Validation & Completion Transition)
 */
export async function submitSurveyResponse(
  {
    assignmentId = "",
    stakeholderTaskId = "",
    category = "",
    answers = {},
    consent = {},
    language = "en",
    respondentName = "",
    respondentType = "",
  },
  worker
) {
  await connectToDatabase();

  const { task, taskType } = await verifyTaskOwnership(
    { assignmentId, stakeholderTaskId },
    worker
  );

  const targetCategory = category || (taskType === "family" ? "family" : task.category);

  if (task.status === "completed") {
    if (taskType === "family" && targetCategory === "light_touch") {
      const existingPhone = await SurveyResponse.findOne({
        assignment: assignmentId,
        category: "light_touch",
        status: { $in: ["submitted", "amended"] },
      });
      if (existingPhone) {
        const err = new Error("This light-touch phone survey has already been completed and submitted.");
        err.statusCode = 400;
        throw err;
      }
    } else if (taskType === "family" && targetCategory === "family") {
      const err = new Error("This task has already been completed and submitted.");
      err.statusCode = 400;
      throw err;
    } else if (taskType === "stakeholder") {
      const err = new Error("This task has already been completed and submitted.");
      err.statusCode = 400;
      throw err;
    }
  }

  // 1. Mandatory Consent Check
  if (!consent || !consent.consentGiven) {
    const err = new Error(
      "Informed consent must be recorded from the respondent before final survey submission."
    );
    err.statusCode = 400;
    throw err;
  }

  const projectId = task.project._id || task.project;
  const roundId = task.surveyRound._id || task.surveyRound;

  // Verify light-touch category constraint
  if (targetCategory === "light_touch" && !task.surveyRound.enableLightTouch) {
    const err = new Error("Light-touch survey is not enabled for the selected survey round.");
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch all applicable active questions for this round & category
  const questions = await Question.find({
    project: projectId,
    category: targetCategory,
    status: "active",
    rounds: roundId,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  if (questions.length === 0) {
    const err = new Error("No active questions configured for this survey round and category.");
    err.statusCode = 400;
    throw err;
  }

  // 3. Strict Validation: Evaluate condition branching & required fields
  for (const q of questions) {
    const isVisible = shouldDisplayQuestion(q, answers);
    if (isVisible && q.isRequired) {
      const val = answers[q.code];
      const isAnswered =
        val !== undefined &&
        val !== null &&
        val !== "" &&
        (!Array.isArray(val) || val.length > 0);

      if (!isAnswered) {
        const err = new Error(
          `Validation Error: Required question "${q.text.en}" (${q.code}) has not been answered.`
        );
        err.statusCode = 400;
        err.missingQuestionCode = q.code;
        throw err;
      }
    }
  }

  // 4. Build complete historical answer snapshots
  const questionsByCode = new Map(questions.map((q) => [q.code, q]));
  const answersArray = [];

  for (const [qCode, val] of Object.entries(answers)) {
    const qDoc = questionsByCode.get(qCode);
    if (qDoc && val !== undefined && val !== null && val !== "") {
      answersArray.push({
        questionId: qDoc._id,
        versionNumber: qDoc.currentVersion || 1,
        questionCode: qCode,
        answerType: qDoc.answerType,
        value: val,
        questionTextSnapshot: {
          en: qDoc.text?.en || "",
          te: qDoc.text?.te || "",
        },
      });
    }
  }

  const now = new Date();

  // 5. Save or Update SurveyResponse to 'submitted'
  const responseQuery = assignmentId
    ? { assignment: assignmentId, category: targetCategory }
    : { stakeholderTask: stakeholderTaskId };

  let response = await SurveyResponse.findOne(responseQuery);

  if (!response) {
    const seq = await Counter.getNextSequence("survey_response_code");
    const responseCode = `RES-${String(seq).padStart(5, "0")}`;

    response = await SurveyResponse.create({
      responseCode,
      project: projectId,
      surveyRound: roundId,
      category: targetCategory,
      assignment: assignmentId || null,
      stakeholderTask: stakeholderTaskId || null,
      family: task.family?._id || null,
      stakeholder: task.stakeholder?._id || null,
      fieldWorker: worker.id,
      respondentType: respondentType || (taskType === "family" ? "family_head" : task.stakeholder?.stakeholderType),
      respondentName: respondentName || (taskType === "family" ? task.family?.householdHeadName : task.stakeholder?.fullName),
      language,
      status: "submitted",
      answers: answersArray,
      consent: {
        consentGiven: true,
        consentTimestamp: now,
        consentLanguage: language,
        notes: consent.notes || "",
      },
      startedAt: task.startedAt || now,
      lastSavedAt: now,
      submittedAt: now,
      revision: 1,
    });
  } else {
    response.answers = answersArray;
    response.consent = {
      consentGiven: true,
      consentTimestamp: response.consent?.consentTimestamp || now,
      consentLanguage: language,
      notes: consent.notes || "",
    };
    response.language = language;
    response.status = "submitted";
    response.lastSavedAt = now;
    response.submittedAt = now;
    if (respondentName) response.respondentName = respondentName;
    if (respondentType) response.respondentType = respondentType;
    await response.save();
  }

  // 6. Transition Parent Task Status to 'completed'
  const beforeTaskStatus = task.status;
  if (taskType === "family" && targetCategory === "family") {
    task.status = "completed";
    task.completedAt = now;
    if (!task.startedAt) task.startedAt = now;
    await task.save();
  } else if (taskType === "stakeholder") {
    task.status = "completed";
    task.completedAt = now;
    if (!task.startedAt) task.startedAt = now;
    await task.save();
  }

  // 7. Audit Logging
  await logAudit({
    actor: worker,
    entityType: "SurveyResponse",
    entityId: response._id,
    action: "STATUS_CHANGE",
    before: { status: "draft" },
    after: {
      status: "submitted",
      responseCode: response.responseCode,
      submittedAt: now,
      answersCount: answersArray.length,
    },
  });

  await logAudit({
    actor: worker,
    entityType: taskType === "family" ? "Assignment" : "StakeholderTask",
    entityId: task._id,
    action: "STATUS_CHANGE",
    before: { status: beforeTaskStatus },
    after: { status: "completed", completedAt: now },
  });

  let nextTask = null;
  let isRoundCompleted = false;
  if (taskType === "family" && assignmentId) {
    try {
      const { evaluateFamilyRoundCompletion } = await import("./familyWorkflowService.js");
      const wf = await evaluateFamilyRoundCompletion(assignmentId);
      if (wf) {
        nextTask = wf.nextTask;
        isRoundCompleted = wf.isRoundCompleted;
      }
    } catch {
      // Safe fallback
    }
  }

  return {
    success: true,
    message: "Survey successfully completed and submitted",
    responseCode: response.responseCode,
    submittedAt: response.submittedAt,
    taskStatus: "completed",
    nextTask,
    isRoundCompleted,
  };
}

/**
 * 4. Get Survey Response Details (Authorized Inspection)
 */
export async function getSurveyResponseDetails(responseId, user) {
  await connectToDatabase();

  if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
    const err = new Error("Invalid response ID");
    err.statusCode = 400;
    throw err;
  }

  const response = await SurveyResponse.findById(responseId)
    .populate("project", "name code")
    .populate("surveyRound", "name code")
    .populate("fieldWorker", "name email")
    .populate("family", "familyCode householdHeadName village mandal facility")
    .populate("stakeholder", "fullName stakeholderType designation")
    .lean();

  if (!response) {
    const err = new Error("Survey response not found");
    err.statusCode = 404;
    throw err;
  }

  // Field workers can only view their own survey responses
  if (user.role === "field_worker") {
    const workerId = response.fieldWorker?._id
      ? response.fieldWorker._id.toString()
      : response.fieldWorker?.toString();
    if (workerId !== user.id.toString()) {
      const err = new Error("Access denied. You can only view your own survey responses.");
      err.statusCode = 403;
      throw err;
    }
  }

  // Mask PII if donor is inspecting
  if (user.role === "donor") {
    if (response.respondentName) {
      response.respondentName = response.respondentName.charAt(0) + "*** (Masked)";
    }
    if (response.family?.householdHeadName) {
      response.family.householdHeadName =
        response.family.householdHeadName.charAt(0) + "*** (Masked)";
    }
  }

  return {
    ...response,
    id: response._id.toString(),
  };
}

/**
 * 5. Protected Administrative Amendment for Post-Submission Corrections (Superadmin Only)
 */
export async function amendSurveyResponse({ responseId, answers, reason }, adminUser) {
  await connectToDatabase();

  if (!adminUser || adminUser.role !== "superadmin") {
    const err = new Error("Access denied. Only Superadmin can perform post-submission corrections.");
    err.statusCode = 403;
    throw err;
  }

  if (!reason || reason.trim().length < 5) {
    const err = new Error("An explicit correction reason of at least 5 characters is required.");
    err.statusCode = 422;
    throw err;
  }

  if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
    const err = new Error("Invalid response ID");
    err.statusCode = 400;
    throw err;
  }

  const response = await SurveyResponse.findById(responseId);
  if (!response) {
    const err = new Error("Survey response not found");
    err.statusCode = 404;
    throw err;
  }

  if (response.status === "draft") {
    const err = new Error("Cannot amend a draft response. Drafts should be submitted by the assigned field worker.");
    err.statusCode = 422;
    throw err;
  }

  // Convert answers array or object into a standardized lookup
  const answersMap = {};
  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (a.questionCode) answersMap[a.questionCode] = a.value;
    }
  } else if (answers && typeof answers === "object") {
    Object.assign(answersMap, answers);
  }

  // Load applicable active questions for validation
  const questions = await Question.find({
    project: response.project,
    category: response.category,
    status: "active",
    rounds: response.surveyRound,
  }).lean();

  // Validate required questions and conditional display rules
  for (const q of questions) {
    const isVisible = shouldDisplayQuestion(q, answersMap);
    if (isVisible && q.isRequired) {
      const val = answersMap[q.code];
      const isAnswered =
        val !== undefined &&
        val !== null &&
        val !== "" &&
        (!Array.isArray(val) || val.length > 0);

      if (!isAnswered) {
        const err = new Error(
          `Validation Error: Required question "${q.text.en}" (${q.code}) has not been answered.`
        );
        err.statusCode = 422;
        err.missingQuestionCode = q.code;
        throw err;
      }
    }
  }

  // Validate types/options for provided answers
  const questionsByCode = new Map(questions.map((q) => [q.code, q]));
  const existingAnswersByCode = new Map((response.answers || []).map((a) => [a.questionCode, a]));

  const updatedAnswersArray = [];
  const now = new Date();

  for (const [qCode, val] of Object.entries(answersMap)) {
    if (val === undefined || val === null || val === "") continue;

    const qDoc = questionsByCode.get(qCode);
    const existingAns = existingAnswersByCode.get(qCode);

    // Validate choice/dropdown if options exist
    if (qDoc && Array.isArray(qDoc.options) && qDoc.options.length > 0) {
      if (["single_choice", "dropdown", "rating_scale"].includes(qDoc.answerType)) {
        const validValues = qDoc.options.flatMap((o) => [o.value, o.code]);
        if (!validValues.includes(String(val))) {
          const err = new Error(`Validation Error: Selected option '${val}' is invalid for question ${qCode}.`);
          err.statusCode = 422;
          throw err;
        }
      } else if (qDoc.answerType === "multiple_choice" && Array.isArray(val)) {
        const validValues = qDoc.options.flatMap((o) => [o.value, o.code]);
        for (const item of val) {
          if (!validValues.includes(String(item))) {
            const err = new Error(`Validation Error: Selected item '${item}' is invalid for question ${qCode}.`);
            err.statusCode = 422;
            throw err;
          }
        }
      }
    }

    updatedAnswersArray.push({
      questionId: qDoc ? qDoc._id : (existingAns ? existingAns.questionId : null),
      questionVersionId: existingAns ? existingAns.questionVersionId : null,
      versionNumber: existingAns ? existingAns.versionNumber : (qDoc ? qDoc.currentVersion || 1 : 1),
      questionCode: qCode,
      answerType: qDoc ? qDoc.answerType : (existingAns ? existingAns.answerType : "short_text"),
      value: val,
      questionTextSnapshot: existingAns?.questionTextSnapshot?.en
        ? existingAns.questionTextSnapshot
        : {
            en: qDoc?.text?.en || "",
            te: qDoc?.text?.te || "",
          },
    });
  }

  // 1. Preserve historical submission revision in revisionHistory
  const previousRevision = response.revision || 1;
  const previousAnswers = response.answers;
  const previousStatus = response.status;

  if (!Array.isArray(response.revisionHistory)) {
    response.revisionHistory = [];
  }

  response.revisionHistory.push({
    revision: previousRevision,
    submittedAt: response.submittedAt || response.updatedAt || now,
    answers: previousAnswers,
    amendedBy: adminUser.id || adminUser._id,
    reason: reason.trim(),
  });

  // 2. Increment revision, update answers, set status to amended
  response.revision = previousRevision + 1;
  response.answers = updatedAnswersArray;
  response.status = "amended";
  response.lastSavedAt = now;
  await response.save();

  // 3. Parent task remains completed - do not reset completed assignment

  // 4. Audit Log
  await logAudit({
    actor: adminUser,
    entityType: "SurveyResponse",
    entityId: response._id,
    action: "UPDATE",
    before: {
      revision: previousRevision,
      status: previousStatus,
      answersCount: previousAnswers.length,
    },
    after: {
      revision: response.revision,
      status: "amended",
      reason: reason.trim(),
      answersCount: updatedAnswersArray.length,
    },
  });

  return {
    success: true,
    message: "Survey response successfully amended",
    responseCode: response.responseCode,
    revision: response.revision,
    status: response.status,
  };
}

