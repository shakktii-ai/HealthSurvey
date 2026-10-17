import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import SurveyResponse from "@/models/SurveyResponse";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import Question from "@/models/Question";
import QuestionVersion from "@/models/QuestionVersion";
import SurveyRound from "@/models/SurveyRound";
import Family from "@/models/Family";
import Counter from "@/models/Counter";
import DataQualityScan from "@/models/DataQualityScan";
import DataQualityIssue from "@/models/DataQualityIssue";
import { shouldDisplayQuestion } from "@/utils/conditionEvaluator";
import { logAudit } from "@/lib/audit";

const BATCH_SIZE = 50;

/**
 * Checks if a value is considered empty for survey answer purposes.
 */
function isAnswerEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Validates whether an answer matches the expected type and option constraints.
 */
function validateAnswerTypeAndValue(ans, question) {
  const issues = [];
  const val = ans.value;

  if (isAnswerEmpty(val)) return issues;

  const expectedType = question ? question.answerType : ans.answerType;

  switch (expectedType) {
    case "number":
      if (typeof val !== "number" && isNaN(Number(val))) {
        issues.push({
          type: "invalid_answer_type",
          severity: "high",
          msg: `Question ${ans.questionCode} expects numeric answer, received: ${typeof val}`,
        });
      }
      break;

    case "date": {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) {
        issues.push({
          type: "invalid_answer_type",
          severity: "high",
          msg: `Question ${ans.questionCode} expects a valid date, received invalid date format`,
        });
      }
      break;
    }

    case "yes_no": {
      const validYesNo = [true, false, "yes", "no", "true", "false", "1", "0"];
      if (!validYesNo.includes(val)) {
        issues.push({
          type: "invalid_answer_type",
          severity: "high",
          msg: `Question ${ans.questionCode} expects yes/no boolean, received: ${val}`,
        });
      }
      break;
    }

    case "single_choice":
    case "dropdown":
    case "rating_scale": {
      if (question && Array.isArray(question.options) && question.options.length > 0) {
        const validValues = question.options.flatMap((o) => [o.value, o.code]);
        if (!validValues.includes(String(val))) {
          issues.push({
            type: "invalid_option_value",
            severity: "high",
            msg: `Selected option '${val}' is not a valid option for question ${ans.questionCode}`,
          });
        }
      }
      break;
    }

    case "multiple_choice": {
      if (!Array.isArray(val)) {
        issues.push({
          type: "invalid_answer_type",
          severity: "high",
          msg: `Question ${ans.questionCode} expects multiple choices as an array, received: ${typeof val}`,
        });
      } else if (question && Array.isArray(question.options) && question.options.length > 0) {
        const validValues = question.options.flatMap((o) => [o.value, o.code]);
        for (const item of val) {
          if (!validValues.includes(String(item))) {
            issues.push({
              type: "invalid_option_value",
              severity: "high",
              msg: `Selected item '${item}' is not a valid option for question ${ans.questionCode}`,
            });
            break;
          }
        }
      }
      break;
    }

    default:
      break;
  }

  return issues;
}

/**
 * Evaluates a single SurveyResponse and returns detected data quality issues.
 */
function evaluateResponseIssues(response, questionMap, roundMap) {
  const issues = [];
  const isSubmittedOrAmended = ["submitted", "amended"].includes(response.status);
  const round = roundMap.get(response.surveyRound?.toString());

  // 1. Missing Required Consent (Critical)
  if (isSubmittedOrAmended) {
    if (
      !response.consent ||
      response.consent.consentGiven !== true ||
      !response.consent.consentTimestamp
    ) {
      issues.push({
        fingerprint: `missing_consent_SurveyResponse_${response._id}`,
        issueType: "missing_consent",
        severity: "critical",
        entityType: "SurveyResponse",
        entityId: response._id,
        entityCode: response.responseCode,
        project: response.project,
        surveyRound: response.surveyRound,
        category: response.category,
        family: response.family,
        familyCode: response.family?.familyCode || "",
        stakeholder: response.stakeholder,
        fieldWorker: response.fieldWorker,
        description: `Survey submission ${response.responseCode} is missing required informed consent record or timestamp.`,
        suggestedAction: "Obtain informed consent record or review field worker submission compliance.",
      });
    }
  }

  // 2. Disabled Light-Touch Round Violation (Critical)
  if (response.category === "light_touch") {
    if (round && !round.enableLightTouch) {
      issues.push({
        fingerprint: `disabled_light_touch_violation_SurveyResponse_${response._id}`,
        issueType: "disabled_light_touch_violation",
        severity: "critical",
        entityType: "SurveyResponse",
        entityId: response._id,
        entityCode: response.responseCode,
        project: response.project,
        surveyRound: response.surveyRound,
        category: response.category,
        family: response.family,
        familyCode: response.family?.familyCode || "",
        stakeholder: response.stakeholder,
        fieldWorker: response.fieldWorker,
        description: `Light-touch survey response ${response.responseCode} is associated with a round (${round.code || "N/A"}) where light-touch is disabled.`,
        suggestedAction: "Enable light-touch for survey round or reclassify response to valid questionnaire category.",
      });
    }
  }

  // 3. Inconsistent Submission Timestamps (Low)
  if (isSubmittedOrAmended) {
    if (!response.submittedAt) {
      issues.push({
        fingerprint: `invalid_submission_timestamp_SurveyResponse_${response._id}`,
        issueType: "invalid_submission_timestamp",
        severity: "low",
        entityType: "SurveyResponse",
        entityId: response._id,
        entityCode: response.responseCode,
        project: response.project,
        surveyRound: response.surveyRound,
        category: response.category,
        family: response.family,
        familyCode: response.family?.familyCode || "",
        stakeholder: response.stakeholder,
        fieldWorker: response.fieldWorker,
        description: `Response ${response.responseCode} is marked as ${response.status} but lacks a valid submission timestamp.`,
        suggestedAction: "Verify submission history and correct submission timestamp.",
      });
    } else if (response.startedAt && response.submittedAt < response.startedAt) {
      issues.push({
        fingerprint: `invalid_submission_timestamp_order_SurveyResponse_${response._id}`,
        issueType: "invalid_submission_timestamp",
        severity: "low",
        entityType: "SurveyResponse",
        entityId: response._id,
        entityCode: response.responseCode,
        project: response.project,
        surveyRound: response.surveyRound,
        category: response.category,
        family: response.family,
        familyCode: response.family?.familyCode || "",
        stakeholder: response.stakeholder,
        fieldWorker: response.fieldWorker,
        description: `Response ${response.responseCode} has submission timestamp earlier than start timestamp.`,
        suggestedAction: "Inspect timestamp sequence and reconcile session chronology.",
      });
    }
  }

  // Prepare answer map for condition evaluator
  const answersMap = {};
  if (Array.isArray(response.answers)) {
    for (const ans of response.answers) {
      answersMap[ans.questionCode] = ans.value;
    }
  }

  // Find all active questions applicable to this project, category, round
  const applicableQuestions = Array.from(questionMap.values()).filter(
    (q) =>
      q.project?.toString() === response.project?.toString() &&
      q.category === response.category &&
      Array.isArray(q.rounds) &&
      q.rounds.some((r) => (r._id ? r._id.toString() : r.toString()) === response.surveyRound?.toString())
  );

  // 4. Missing Required Answers (High) - for submitted responses
  if (isSubmittedOrAmended) {
    for (const q of applicableQuestions) {
      if (q.isRequired) {
        const isVisible = shouldDisplayQuestion(q, answersMap);
        if (isVisible) {
          const recordedVal = answersMap[q.code];
          if (isAnswerEmpty(recordedVal)) {
            issues.push({
              fingerprint: `missing_required_answer_SurveyResponse_${response._id}_${q.code}`,
              issueType: "missing_required_answer",
              severity: "high",
              entityType: "SurveyResponse",
              entityId: response._id,
              entityCode: response.responseCode,
              project: response.project,
              surveyRound: response.surveyRound,
              category: response.category,
              family: response.family,
              familyCode: response.family?.familyCode || "",
              stakeholder: response.stakeholder,
              fieldWorker: response.fieldWorker,
              questionCode: q.code,
              description: `Required question ${q.code} was omitted from submitted response ${response.responseCode}.`,
              suggestedAction: "Conduct follow-up with field worker or amend submission with missing mandatory answer.",
            });
          }
        }
      }
    }
  }

  // Inspect each answer in response
  if (Array.isArray(response.answers)) {
    for (const ans of response.answers) {
      const q = questionMap.get(ans.questionCode);

      // 5. Question Out of Scope (Medium)
      if (q) {
        const qRounds = (q.rounds || []).map((r) => (r._id ? r._id.toString() : r.toString()));
        const isRoundIncluded = qRounds.includes(response.surveyRound?.toString());
        const isCategoryMatch = q.category === response.category;
        const isProjectMatch = q.project?.toString() === response.project?.toString();

        if (!isRoundIncluded || !isCategoryMatch || !isProjectMatch) {
          issues.push({
            fingerprint: `question_out_of_scope_SurveyResponse_${response._id}_${ans.questionCode}`,
            issueType: "question_out_of_scope",
            severity: "medium",
            entityType: "SurveyResponse",
            entityId: response._id,
            entityCode: response.responseCode,
            project: response.project,
            surveyRound: response.surveyRound,
            category: response.category,
            family: response.family,
            familyCode: response.family?.familyCode || "",
            stakeholder: response.stakeholder,
            fieldWorker: response.fieldWorker,
            questionCode: ans.questionCode,
            description: `Answered question ${ans.questionCode} is outside the active scope of category '${response.category}' or assigned survey round.`,
            suggestedAction: "Verify questionnaire versioning and remove out-of-scope response field via amendment.",
          });
        }

        // 6. Conditional Visibility Violation (High)
        const isVisible = shouldDisplayQuestion(q, answersMap);
        if (!isVisible && !isAnswerEmpty(ans.value)) {
          issues.push({
            fingerprint: `conditional_visibility_violation_SurveyResponse_${response._id}_${ans.questionCode}`,
            issueType: "conditional_visibility_violation",
            severity: "high",
            entityType: "SurveyResponse",
            entityId: response._id,
            entityCode: response.responseCode,
            project: response.project,
            surveyRound: response.surveyRound,
            category: response.category,
            family: response.family,
            familyCode: response.family?.familyCode || "",
            stakeholder: response.stakeholder,
            fieldWorker: response.fieldWorker,
            questionCode: ans.questionCode,
            description: `Question ${ans.questionCode} was answered but its display conditions evaluated to hidden.`,
            suggestedAction: "Review answer dependencies and remove erroneous answer or correct controlling parent question.",
          });
        }
      }

      // 7. Invalid Answer Type & Option Values (High)
      const typeIssues = validateAnswerTypeAndValue(ans, q);
      for (const t of typeIssues) {
        issues.push({
          fingerprint: `${t.type}_SurveyResponse_${response._id}_${ans.questionCode}`,
          issueType: t.type,
          severity: t.severity,
          entityType: "SurveyResponse",
          entityId: response._id,
          entityCode: response.responseCode,
          project: response.project,
          surveyRound: response.surveyRound,
          category: response.category,
          family: response.family,
          familyCode: response.family?.familyCode || "",
          stakeholder: response.stakeholder,
          fieldWorker: response.fieldWorker,
          questionCode: ans.questionCode,
          description: t.msg,
          suggestedAction: "Amend the survey response with a validated answer type or valid option value.",
        });
      }

      // 8. Question Version Reference Mismatch (Medium)
      if (q && ans.versionNumber && q.currentVersion && ans.versionNumber > q.currentVersion) {
        issues.push({
          fingerprint: `question_version_mismatch_SurveyResponse_${response._id}_${ans.questionCode}`,
          issueType: "question_version_mismatch",
          severity: "medium",
          entityType: "SurveyResponse",
          entityId: response._id,
          entityCode: response.responseCode,
          project: response.project,
          surveyRound: response.surveyRound,
          category: response.category,
          family: response.family,
          familyCode: response.family?.familyCode || "",
          stakeholder: response.stakeholder,
          fieldWorker: response.fieldWorker,
          questionCode: ans.questionCode,
          description: `Recorded answer version (${ans.versionNumber}) for ${ans.questionCode} exceeds current question version (${q.currentVersion}).`,
          suggestedAction: "Audit question versioning history and re-align question snapshot.",
        });
      }
    }
  }

  return issues;
}

/**
 * 1. Run Data Quality Scan Engine (Superadmin Action)
 * Processes records in bounded batches, evaluates data quality rules, and reconciles issues.
 */
export async function runDataQualityScan({ projectId = "", surveyRoundId = "", category = "" } = {}, user) {
  await connectToDatabase();

  // Scope filter objects
  const scanFilter = {};
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    scanFilter.project = new mongoose.Types.ObjectId(projectId);
  }
  if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
    scanFilter.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);
  }

  // Prevent overlapping scans for same scope within last 5 minutes
  const activeScan = await DataQualityScan.findOne({
    ...scanFilter,
    status: "running",
    startedAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
  });

  if (activeScan) {
    const err = new Error("A data quality scan is already actively running for the selected scope.");
    err.statusCode = 409;
    throw err;
  }

  // Generate unique scan code atomically
  const scanSeq = await Counter.getNextSequence("data_quality_scan");
  const scanCode = `SCAN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(scanSeq).padStart(4, "0")}`;

  const scanDoc = await DataQualityScan.create({
    scanCode,
    project: scanFilter.project || null,
    surveyRound: scanFilter.surveyRound || null,
    category: category || "",
    status: "running",
    startedAt: new Date(),
    initiatedBy: user.id || user._id,
  });

  await logAudit({
    actor: user,
    entityType: "DataQualityScan",
    entityId: scanDoc._id,
    action: "SCAN_START",
    after: { scanCode, project: projectId, surveyRound: surveyRoundId },
  });

  let totalScanned = 0;
  let responsesScanned = 0;
  let assignmentsScanned = 0;
  let stakeholderTasksScanned = 0;
  const detectedIssuesMap = new Map(); // fingerprint -> issueObj

  try {
    // Preload active questions and survey rounds in memory lookup maps
    const questionQuery = { status: { $in: ["active", "archived", "draft"] } };
    if (scanFilter.project) questionQuery.project = scanFilter.project;
    const allQuestions = await Question.find(questionQuery).lean();
    const questionMap = new Map();
    for (const q of allQuestions) {
      questionMap.set(q.code, q);
    }

    const roundQuery = scanFilter.project ? { project: scanFilter.project } : {};
    const allRounds = await SurveyRound.find(roundQuery).lean();
    const roundMap = new Map();
    for (const r of allRounds) {
      roundMap.set(r._id.toString(), r);
    }

    // --- PHASE A: Batch Process Survey Responses ---
    const responseQuery = { ...scanFilter };
    if (category) responseQuery.category = category;

    const totalResponseCount = await SurveyResponse.countDocuments(responseQuery);
    for (let offset = 0; offset < totalResponseCount; offset += BATCH_SIZE) {
      const batch = await SurveyResponse.find(responseQuery)
        .populate("family", "familyCode householdHeadName")
        .populate("stakeholder", "fullName")
        .populate("assignment", "status project surveyRound family fieldWorker")
        .populate("stakeholderTask", "status project surveyRound stakeholder category fieldWorker")
        .skip(offset)
        .limit(BATCH_SIZE)
        .lean();

      for (const resp of batch) {
        responsesScanned++;
        totalScanned++;

        // 1. Evaluate Response-Level Quality Rules
        const respIssues = evaluateResponseIssues(resp, questionMap, roundMap);
        for (const iss of respIssues) {
          detectedIssuesMap.set(iss.fingerprint, iss);
        }

        // 2. Cross-Entity Integrity: Inconsistent References (Critical)
        if (resp.assignment) {
          const asg = resp.assignment;
          const projMismatch = asg.project && resp.project && asg.project.toString() !== resp.project.toString();
          const roundMismatch = asg.surveyRound && resp.surveyRound && asg.surveyRound.toString() !== resp.surveyRound.toString();
          const familyMismatch = asg.family && resp.family && asg.family.toString() !== (resp.family._id ? resp.family._id.toString() : resp.family.toString());
          const workerMismatch = asg.fieldWorker && resp.fieldWorker && asg.fieldWorker.toString() !== resp.fieldWorker.toString();

          if (projMismatch || roundMismatch || familyMismatch || workerMismatch) {
            const fp = `inconsistent_references_SurveyResponse_${resp._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "inconsistent_references",
              severity: "critical",
              entityType: "SurveyResponse",
              entityId: resp._id,
              entityCode: resp.responseCode,
              project: resp.project,
              surveyRound: resp.surveyRound,
              category: resp.category,
              family: resp.family,
              familyCode: resp.family?.familyCode || "",
              fieldWorker: resp.fieldWorker,
              description: `Response references do not match linked assignment (Worker, Family, Round, or Project mismatch).`,
              suggestedAction: "Reconcile assignment assignment linkage and correct response association.",
            });
          }

          // 3. Submitted response whose parent assignment is not marked completed (Medium)
          if (["submitted", "amended"].includes(resp.status) && asg.status !== "completed") {
            const fp = `submitted_response_task_incomplete_SurveyResponse_${resp._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "submitted_response_task_incomplete",
              severity: "medium",
              entityType: "SurveyResponse",
              entityId: resp._id,
              entityCode: resp.responseCode,
              project: resp.project,
              surveyRound: resp.surveyRound,
              category: resp.category,
              family: resp.family,
              familyCode: resp.family?.familyCode || "",
              fieldWorker: resp.fieldWorker,
              description: `Survey response ${resp.responseCode} is submitted, but parent assignment is currently '${asg.status}'.`,
              suggestedAction: "Update assignment status to completed or reconcile submission workflow.",
            });
          }
        }

        // 4. Stakeholder Task cross-integrity
        if (resp.stakeholderTask) {
          const st = resp.stakeholderTask;
          const projMismatch = st.project && resp.project && st.project.toString() !== resp.project.toString();
          const roundMismatch = st.surveyRound && resp.surveyRound && st.surveyRound.toString() !== resp.surveyRound.toString();
          const stakeholderMismatch = st.stakeholder && resp.stakeholder && st.stakeholder.toString() !== (resp.stakeholder._id ? resp.stakeholder._id.toString() : resp.stakeholder.toString());

          if (projMismatch || roundMismatch || stakeholderMismatch) {
            const fp = `inconsistent_references_Stakeholder_SurveyResponse_${resp._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "inconsistent_references",
              severity: "critical",
              entityType: "SurveyResponse",
              entityId: resp._id,
              entityCode: resp.responseCode,
              project: resp.project,
              surveyRound: resp.surveyRound,
              category: resp.category,
              stakeholder: resp.stakeholder,
              fieldWorker: resp.fieldWorker,
              description: `Stakeholder response references do not match linked stakeholder task.`,
              suggestedAction: "Reconcile stakeholder task linkage.",
            });
          }

          if (["submitted", "amended"].includes(resp.status) && st.status !== "completed") {
            const fp = `submitted_response_task_incomplete_StakeholderTask_${resp._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "submitted_response_task_incomplete",
              severity: "medium",
              entityType: "SurveyResponse",
              entityId: resp._id,
              entityCode: resp.responseCode,
              project: resp.project,
              surveyRound: resp.surveyRound,
              category: resp.category,
              stakeholder: resp.stakeholder,
              fieldWorker: resp.fieldWorker,
              description: `Stakeholder survey is submitted, but task status is '${st.status}'.`,
              suggestedAction: "Update stakeholder task status to completed.",
            });
          }
        }
      }
    }

    // --- PHASE B: Duplicate Responses Detection (Critical) ---
    // Detect duplicate responses for the same logical task
    const duplicateAssignmentAgg = await SurveyResponse.aggregate([
      { $match: { ...scanFilter, assignment: { $ne: null } } },
      { $group: { _id: "$assignment", count: { $sum: 1 }, docIds: { $push: "$_id" }, codes: { $push: "$responseCode" } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    for (const dup of duplicateAssignmentAgg) {
      for (let i = 0; i < dup.docIds.length; i++) {
        const fp = `duplicate_response_Assignment_${dup._id}_${dup.docIds[i]}`;
        detectedIssuesMap.set(fp, {
          fingerprint: fp,
          issueType: "duplicate_response",
          severity: "critical",
          entityType: "SurveyResponse",
          entityId: dup.docIds[i],
          entityCode: dup.codes[i] || "",
          project: scanFilter.project,
          surveyRound: scanFilter.surveyRound,
          description: `Multiple survey responses (${dup.codes.join(", ")}) exist for the same assignment task.`,
          suggestedAction: "Review duplicate submissions and archive or merge redundant response record.",
        });
      }
    }

    // --- PHASE C: Batch Process Family Assignments ---
    const assignmentQuery = { ...scanFilter };
    const totalAssignmentCount = await Assignment.countDocuments(assignmentQuery);

    for (let offset = 0; offset < totalAssignmentCount; offset += BATCH_SIZE) {
      const batch = await Assignment.find(assignmentQuery)
        .populate("family", "familyCode householdHeadName")
        .skip(offset)
        .limit(BATCH_SIZE)
        .lean();

      for (const asg of batch) {
        assignmentsScanned++;
        totalScanned++;

        // 1. Completed assignment with no submitted response (High)
        if (asg.status === "completed") {
          const matchingResp = await SurveyResponse.findOne({
            assignment: asg._id,
            status: { $in: ["submitted", "amended"] },
          }).lean();

          if (!matchingResp) {
            const fp = `completed_task_missing_response_Assignment_${asg._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "completed_task_missing_response",
              severity: "high",
              entityType: "Assignment",
              entityId: asg._id,
              entityCode: asg.assignmentCode,
              project: asg.project,
              surveyRound: asg.surveyRound,
              category: "family",
              family: asg.family,
              familyCode: asg.family?.familyCode || "",
              fieldWorker: asg.fieldWorker,
              description: `Assignment ${asg.assignmentCode} is marked 'completed' but has no submitted survey response document.`,
              suggestedAction: "Investigate field submission or reset assignment to in-progress for re-submission.",
            });
          }
        }

        // 2. Draft response attached to cancelled assignment (Medium)
        if (asg.status === "cancelled") {
          const draftResp = await SurveyResponse.findOne({
            assignment: asg._id,
            status: "draft",
          }).lean();

          if (draftResp) {
            const fp = `draft_on_cancelled_task_Assignment_${asg._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "draft_on_cancelled_task",
              severity: "medium",
              entityType: "Assignment",
              entityId: asg._id,
              entityCode: asg.assignmentCode,
              project: asg.project,
              surveyRound: asg.surveyRound,
              category: "family",
              family: asg.family,
              familyCode: asg.family?.familyCode || "",
              fieldWorker: asg.fieldWorker,
              description: `A draft survey response (${draftResp.responseCode}) exists for cancelled assignment ${asg.assignmentCode}.`,
              suggestedAction: "Clean up draft or re-open assignment if cancellation was made in error.",
            });
          }
        }
      }
    }

    // --- PHASE D: Batch Process Stakeholder Tasks ---
    const taskQuery = { ...scanFilter };
    if (category && category !== "family") taskQuery.category = category;
    const totalTaskCount = await StakeholderTask.countDocuments(taskQuery);

    for (let offset = 0; offset < totalTaskCount; offset += BATCH_SIZE) {
      const batch = await StakeholderTask.find(taskQuery)
        .populate("stakeholder", "fullName")
        .skip(offset)
        .limit(BATCH_SIZE)
        .lean();

      for (const st of batch) {
        stakeholderTasksScanned++;
        totalScanned++;

        if (st.status === "completed") {
          const matchingResp = await SurveyResponse.findOne({
            stakeholderTask: st._id,
            status: { $in: ["submitted", "amended"] },
          }).lean();

          if (!matchingResp) {
            const fp = `completed_task_missing_response_StakeholderTask_${st._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "completed_task_missing_response",
              severity: "high",
              entityType: "StakeholderTask",
              entityId: st._id,
              entityCode: st.taskCode,
              project: st.project,
              surveyRound: st.surveyRound,
              category: st.category,
              stakeholder: st.stakeholder,
              fieldWorker: st.fieldWorker,
              description: `Stakeholder task ${st.taskCode} is marked 'completed' but lacks a submitted survey response.`,
              suggestedAction: "Investigate missing stakeholder response or reset task status.",
            });
          }
        }

        if (st.status === "cancelled") {
          const draftResp = await SurveyResponse.findOne({
            stakeholderTask: st._id,
            status: "draft",
          }).lean();

          if (draftResp) {
            const fp = `draft_on_cancelled_task_StakeholderTask_${st._id}`;
            detectedIssuesMap.set(fp, {
              fingerprint: fp,
              issueType: "draft_on_cancelled_task",
              severity: "medium",
              entityType: "StakeholderTask",
              entityId: st._id,
              entityCode: st.taskCode,
              project: st.project,
              surveyRound: st.surveyRound,
              category: st.category,
              stakeholder: st.stakeholder,
              fieldWorker: st.fieldWorker,
              description: `A draft stakeholder survey (${draftResp.responseCode}) exists for cancelled task ${st.taskCode}.`,
              suggestedAction: "Clean up draft or re-open stakeholder task.",
            });
          }
        }
      }
    }

    // --- PHASE E: Reconcile Issues in Database ---
    const detectedFingerprints = Array.from(detectedIssuesMap.keys());
    let newIssuesCount = 0;
    let reopenedIssuesCount = 0;
    let unchangedIssuesCount = 0;
    let resolvedIssuesCount = 0;

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    const now = new Date();

    // Upsert detected issues in bounded batches
    for (const [fingerprint, issueData] of detectedIssuesMap.entries()) {
      severityCounts[issueData.severity] = (severityCounts[issueData.severity] || 0) + 1;

      const existing = await DataQualityIssue.findOne({ fingerprint });
      if (!existing) {
        const issueSeq = await Counter.getNextSequence("data_quality_issue");
        const issueCode = `ISSUE-${String(issueSeq).padStart(5, "0")}`;

        await DataQualityIssue.create({
          ...issueData,
          issueCode,
          fingerprint,
          status: "detected",
          firstDetectedAt: now,
          lastDetectedAt: now,
          lastScanId: scanDoc._id,
        });
        newIssuesCount++;
      } else {
        if (["resolved", "no_longer_detected"].includes(existing.status)) {
          existing.status = "detected";
          existing.resolutionReason = "";
          existing.resolvedBy = null;
          existing.resolvedAt = null;
          reopenedIssuesCount++;
        } else {
          unchangedIssuesCount++;
        }
        existing.lastDetectedAt = now;
        existing.lastScanId = scanDoc._id;
        existing.description = issueData.description;
        existing.suggestedAction = issueData.suggestedAction;
        await existing.save();
      }
    }

    // Auto-resolve any previously detected issues in scope that are no longer detected
    const scopeIssueFilter = {
      status: { $in: ["detected", "acknowledged"] },
      fingerprint: { $nin: detectedFingerprints },
    };
    if (scanFilter.project) scopeIssueFilter.project = scanFilter.project;
    if (scanFilter.surveyRound) scopeIssueFilter.surveyRound = scanFilter.surveyRound;

    const autoResolveList = await DataQualityIssue.find(scopeIssueFilter);
    for (const item of autoResolveList) {
      item.status = "resolved";
      item.resolvedAt = now;
      item.resolutionReason = "Automatically resolved: condition no longer detected in scan.";
      item.lastScanId = scanDoc._id;
      await item.save();
      resolvedIssuesCount++;
    }

    // Finalize scan document
    scanDoc.status = "completed";
    scanDoc.completedAt = now;
    scanDoc.totalScanned = totalScanned;
    scanDoc.recordsProcessed = {
      responses: responsesScanned,
      assignments: assignmentsScanned,
      stakeholderTasks: stakeholderTasksScanned,
    };
    scanDoc.issuesDetected = detectedIssuesMap.size;
    scanDoc.issuesCountBySeverity = severityCounts;
    scanDoc.newIssuesCount = newIssuesCount;
    scanDoc.reopenedIssuesCount = reopenedIssuesCount;
    scanDoc.resolvedIssuesCount = resolvedIssuesCount;
    scanDoc.unchangedIssuesCount = unchangedIssuesCount;
    await scanDoc.save();

    await logAudit({
      actor: user,
      entityType: "DataQualityScan",
      entityId: scanDoc._id,
      action: "SCAN_COMPLETE",
      after: {
        scanCode,
        totalScanned,
        issuesDetected: detectedIssuesMap.size,
        newIssues: newIssuesCount,
        resolvedIssues: resolvedIssuesCount,
      },
    });

    return scanDoc.toSafeObject();
  } catch (err) {
    console.error("Data quality scan failed:", err);
    scanDoc.status = "failed";
    scanDoc.completedAt = new Date();
    scanDoc.totalScanned = totalScanned;
    scanDoc.recordsProcessed = {
      responses: responsesScanned,
      assignments: assignmentsScanned,
      stakeholderTasks: stakeholderTasksScanned,
    };
    scanDoc.issuesDetected = detectedIssuesMap.size;
    scanDoc.errorMessage = err.message || "An unexpected error occurred during scan execution";
    await scanDoc.save();

    await logAudit({
      actor: user,
      entityType: "DataQualityScan",
      entityId: scanDoc._id,
      action: "SCAN_COMPLETE",
      after: { scanCode, status: "failed", error: err.message },
    });

    const errorObj = new Error(`Data quality scan failed: ${err.message}`);
    errorObj.partialResult = scanDoc.toSafeObject();
    errorObj.statusCode = 500;
    throw errorObj;
  }
}

/**
 * 2. Get Paginated List of Issues with Advanced Filtering & Summary Metrics
 */
export async function getIssuesList({
  projectId = "",
  surveyRoundId = "",
  category = "",
  severity = "",
  issueType = "",
  status = "",
  search = "",
  page = 1,
  limit = 20,
} = {}) {
  await connectToDatabase();

  const query = {};

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    query.project = new mongoose.Types.ObjectId(projectId);
  }
  if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
    query.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);
  }
  if (category) query.category = category;
  if (severity) query.severity = severity;
  if (issueType) query.issueType = issueType;
  if (status) query.status = status;

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { issueCode: { $regex: term, $options: "i" } },
      { entityCode: { $regex: term, $options: "i" } },
      { familyCode: { $regex: term, $options: "i" } },
      { questionCode: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * pageSize;

  const [items, total] = await Promise.all([
    DataQualityIssue.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code")
      .populate("family", "familyCode householdHeadName")
      .populate("stakeholder", "fullName stakeholderType")
      .populate("fieldWorker", "name email")
      .populate("acknowledgedBy", "name email")
      .populate("resolvedBy", "name email")
      .sort({ severity: 1, lastDetectedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    DataQualityIssue.countDocuments(query),
  ]);

  // Aggregate severity and status breakdowns for the current filtered scope
  const summaryScope = {};
  if (query.project) summaryScope.project = query.project;
  if (query.surveyRound) summaryScope.surveyRound = query.surveyRound;

  const severityCountsAgg = await DataQualityIssue.aggregate([
    { $match: summaryScope },
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);

  const statusCountsAgg = await DataQualityIssue.aggregate([
    { $match: summaryScope },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const s of severityCountsAgg) {
    if (s._id) severityCounts[s._id] = s.count;
  }

  const statusCounts = { detected: 0, acknowledged: 0, resolved: 0, no_longer_detected: 0 };
  for (const st of statusCountsAgg) {
    if (st._id) statusCounts[st._id] = st.count;
  }

  return {
    items: items.map((it) => ({
      ...it,
      id: it._id.toString(),
      entityId: it.entityId ? it.entityId.toString() : null,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
    summary: {
      severityCounts,
      statusCounts,
      totalUnresolved: (statusCounts.detected || 0) + (statusCounts.acknowledged || 0),
    },
  };
}

/**
 * 3. Get Single Issue Details
 */
export async function getIssueDetails(issueId) {
  await connectToDatabase();

  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    const err = new Error("Invalid issue ID");
    err.statusCode = 400;
    throw err;
  }

  const issue = await DataQualityIssue.findById(issueId)
    .populate("project", "name code")
    .populate("surveyRound", "name code")
    .populate("family", "familyCode householdHeadName")
    .populate("stakeholder", "fullName stakeholderType")
    .populate("fieldWorker", "name email phone")
    .populate("acknowledgedBy", "name email")
    .populate("resolvedBy", "name email")
    .populate("lastScanId", "scanCode startedAt completedAt status")
    .lean();

  if (!issue) {
    const err = new Error("Data quality issue record not found");
    err.statusCode = 404;
    throw err;
  }

  // Mask PII by default
  if (issue.family?.householdHeadName) {
    issue.family.householdHeadName = issue.family.householdHeadName.charAt(0) + "*** (Masked)";
  }
  if (issue.fieldWorker?.phone) {
    issue.fieldWorker.phone = issue.fieldWorker.phone.slice(0, 4) + "******" + issue.fieldWorker.phone.slice(-2);
  }

  return {
    ...issue,
    id: issue._id.toString(),
  };
}

/**
 * 4. Acknowledge Issue
 */
export async function acknowledgeIssue(issueId, user) {
  await connectToDatabase();

  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    const err = new Error("Invalid issue ID");
    err.statusCode = 400;
    throw err;
  }

  const issue = await DataQualityIssue.findById(issueId);
  if (!issue) {
    const err = new Error("Data quality issue record not found");
    err.statusCode = 404;
    throw err;
  }

  if (issue.status === "resolved") {
    const err = new Error("Cannot acknowledge an already resolved issue.");
    err.statusCode = 409;
    throw err;
  }

  const beforeStatus = issue.status;
  issue.status = "acknowledged";
  issue.acknowledgedBy = user.id || user._id;
  issue.acknowledgedAt = new Date();
  await issue.save();

  await logAudit({
    actor: user,
    entityType: "DataQualityIssue",
    entityId: issue._id,
    action: "ACKNOWLEDGE",
    before: { status: beforeStatus },
    after: { status: "acknowledged", acknowledgedAt: issue.acknowledgedAt },
  });

  return issue.toSafeObject();
}

/**
 * 5. Resolve Issue with Explicit Reason
 */
export async function resolveIssue(issueId, { reason }, user) {
  await connectToDatabase();

  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    const err = new Error("Invalid issue ID");
    err.statusCode = 400;
    throw err;
  }

  if (!reason || reason.trim().length < 5) {
    const err = new Error("An explicit resolution reason of at least 5 characters is required.");
    err.statusCode = 422;
    throw err;
  }

  const issue = await DataQualityIssue.findById(issueId);
  if (!issue) {
    const err = new Error("Data quality issue record not found");
    err.statusCode = 404;
    throw err;
  }

  const beforeStatus = issue.status;
  issue.status = "resolved";
  issue.resolvedBy = user.id || user._id;
  issue.resolvedAt = new Date();
  issue.resolutionReason = reason.trim();
  await issue.save();

  await logAudit({
    actor: user,
    entityType: "DataQualityIssue",
    entityId: issue._id,
    action: "RESOLVE",
    before: { status: beforeStatus },
    after: { status: "resolved", reason: issue.resolutionReason, resolvedAt: issue.resolvedAt },
  });

  return issue.toSafeObject();
}

/**
 * 6. Get Recent Scan History
 */
export async function getScanHistory({ projectId = "", surveyRoundId = "", limit = 10, page = 1 } = {}) {
  await connectToDatabase();

  const query = {};
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) query.project = new mongoose.Types.ObjectId(projectId);
  if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) query.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * pageSize;

  const [scans, total] = await Promise.all([
    DataQualityScan.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code")
      .populate("initiatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    DataQualityScan.countDocuments(query),
  ]);

  return {
    items: scans.map((s) => ({
      ...s,
      id: s._id.toString(),
    })),
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

/**
 * 7. Protected Administrative Amendment for Post-Submission Corrections (Superadmin Only)
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

