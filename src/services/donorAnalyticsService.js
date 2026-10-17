import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/Project";
import SurveyRound from "@/models/SurveyRound";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import Question from "@/models/Question";
import QuestionVersion from "@/models/QuestionVersion";
import DataQualityIssue from "@/models/DataQualityIssue";
import Mandal from "@/models/Mandal";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import { verifyDonorProjectAccess, getAuthorizedProjectIdsForDonor } from "@/services/donorAccessService";
import { logAudit } from "@/lib/audit";

/**
 * Server-side minimum group size for small-group suppression.
 * Aggregates based on fewer than 5 respondents are strictly suppressed to protect privacy.
 */
export const MIN_GROUP_SIZE = 5;

/**
 * Helper to escape CSV cell values against spreadsheet formula injection.
 * Prepends a single quote (') if the value starts with =, +, -, @, \t, or \r.
 */
export function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Formula injection mitigation
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Quote if contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Returns list of projects authorized for the authenticated donor with high-level KPI metrics.
 */
export async function getDonorProjectsList(user) {
  await connectToDatabase();

  let projectQuery = { status: "active" };

  if (user.role === "donor") {
    const authorizedIds = await getAuthorizedProjectIdsForDonor(user.id || user._id);
    if (!authorizedIds || authorizedIds.length === 0) {
      return [];
    }
    projectQuery._id = { $in: authorizedIds };
  } else if (user.role !== "superadmin") {
    return [];
  }

  const projects = await Project.find(projectQuery).sort({ createdAt: -1 });

  const result = [];
  for (const proj of projects) {
    const rounds = await SurveyRound.find({ project: proj._id }).sort({ createdAt: 1 });

    // Calculate actual DB metrics
    // Strictly exclude cancelled tasks from eligible denominator
    const totalEligible = await Assignment.countDocuments({
      project: proj._id,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });

    const completedAssignments = await Assignment.countDocuments({
      project: proj._id,
      status: "completed",
    });

    const outstandingAssignments = Math.max(0, totalEligible - completedAssignments);
    const completionPercentage = totalEligible > 0 ? Number(((completedAssignments / totalEligible) * 100).toFixed(1)) : 0;

    // Stakeholder tasks (kept strictly separate from family assignments)
    const totalStakeholder = await StakeholderTask.countDocuments({
      project: proj._id,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });

    const completedStakeholder = await StakeholderTask.countDocuments({
      project: proj._id,
      status: "completed",
    });

    const stakeholderCompletionPercentage = totalStakeholder > 0 ? Number(((completedStakeholder / totalStakeholder) * 100).toFixed(1)) : 0;

    result.push({
      id: proj._id.toString(),
      name: proj.name,
      code: proj.code,
      description: proj.description || "",
      startDate: proj.startDate,
      endDate: proj.endDate,
      status: proj.status,
      surveyRounds: rounds.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        code: r.code,
        status: r.status,
        targetTiming: r.targetTiming,
        plannedStartDate: r.plannedStartDate,
        plannedEndDate: r.plannedEndDate,
      })),
      metrics: {
        totalEligibleAssignments: totalEligible,
        completedAssignments,
        outstandingAssignments,
        completionPercentage,
        stakeholderInterviews: {
          totalEligible: totalStakeholder,
          completed: completedStakeholder,
          completionPercentage: stakeholderCompletionPercentage,
        },
      },
      lastRefreshedAt: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Returns project impact overview, coverage metrics, and data quality summaries.
 */
export async function getProjectImpactOverview(user, projectId, roundId = null) {
  const hasAccess = await verifyDonorProjectAccess(user, projectId);
  if (!hasAccess) {
    const error = new Error("Access denied. You are not authorized to view analytics for this project.");
    error.statusCode = 403;
    throw error;
  }

  await connectToDatabase();

  const project = await Project.findById(projectId);
  if (!project || project.status !== "active") {
    const error = new Error("Project not found or inactive");
    error.statusCode = 404;
    throw error;
  }

  const rounds = await SurveyRound.find({ project: projectId }).sort({ createdAt: 1 });

  const assignmentMatch = { project: projectId };
  const stakeholderMatch = { project: projectId };
  const responseMatch = { project: projectId, status: { $in: ["submitted", "amended"] } };
  const issueMatch = { project: projectId, status: { $in: ["detected", "acknowledged"] } };

  if (roundId) {
    assignmentMatch.surveyRound = roundId;
    stakeholderMatch.surveyRound = roundId;
    responseMatch.surveyRound = roundId;
    issueMatch.surveyRound = roundId;
  }

  // 1. Household coverage (denominator excludes cancelled)
  const eligibleAssignments = await Assignment.countDocuments({
    ...assignmentMatch,
    status: { $in: ["assigned", "in_progress", "completed"] },
  });

  const assignedTasks = await Assignment.countDocuments({
    ...assignmentMatch,
    status: "assigned",
  });

  const inProgressTasks = await Assignment.countDocuments({
    ...assignmentMatch,
    status: "in_progress",
  });

  const completedTasks = await Assignment.countDocuments({
    ...assignmentMatch,
    status: "completed",
  });

  const cancelledTasks = await Assignment.countDocuments({
    ...assignmentMatch,
    status: "cancelled",
  });

  const completionPercentage = eligibleAssignments > 0 ? Number(((completedTasks / eligibleAssignments) * 100).toFixed(1)) : 0;

  // 2. Survey responses by status (drafts tracked separately, not in submitted count)
  const submittedResponses = await SurveyResponse.countDocuments({
    project: projectId,
    ...(roundId ? { surveyRound: roundId } : {}),
    status: { $in: ["submitted", "amended"] },
  });

  const draftResponses = await SurveyResponse.countDocuments({
    project: projectId,
    ...(roundId ? { surveyRound: roundId } : {}),
    status: "draft",
  });

  // 3. Stakeholder tasks by category
  const stakeholderCategories = ["asha", "facility_staff", "govt_official"];
  const stakeholderStats = {};

  for (const cat of stakeholderCategories) {
    const eligible = await StakeholderTask.countDocuments({
      ...stakeholderMatch,
      category: cat,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });
    const completed = await StakeholderTask.countDocuments({
      ...stakeholderMatch,
      category: cat,
      status: "completed",
    });
    stakeholderStats[cat] = {
      eligible,
      completed,
      completionPercentage: eligible > 0 ? Number(((completed / eligible) * 100).toFixed(1)) : 0,
    };
  }

  // 4. Data Quality summary (counts by severity; no PII or raw entities)
  const issuesBySeverity = await DataQualityIssue.aggregate([
    { $match: issueMatch },
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  issuesBySeverity.forEach((item) => {
    if (severityCounts[item._id] !== undefined) {
      severityCounts[item._id] = item.count;
    }
  });

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      code: project.code,
      description: project.description || "",
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
    },
    surveyRounds: rounds.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      code: r.code,
      status: r.status,
      targetTiming: r.targetTiming,
    })),
    selectedRoundId: roundId,
    householdCoverage: {
      totalEligible: eligibleAssignments,
      assigned: assignedTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      cancelled: cancelledTasks,
      completionPercentage,
      denominatorDefinition: "Eligible assignments = assigned + in_progress + completed. Cancelled assignments are strictly excluded from completion denominator.",
    },
    surveyResponses: {
      submittedOrAmended: submittedResponses,
      draftsInProgress: draftResponses,
    },
    stakeholderInterviews: stakeholderStats,
    dataQualitySummary: {
      severityCounts,
      totalActiveIssues: severityCounts.critical + severityCounts.high + severityCounts.medium + severityCounts.low,
      assuranceStatement: "Automated rule validation monitors consistency and completeness. Individual entities are redacted from donor views.",
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Returns geographic coverage (Mandal, Facility, Village) with server-side small group suppression.
 */
export async function getGeographicCoverage(user, projectId, { roundId } = {}) {
  const hasAccess = await verifyDonorProjectAccess(user, projectId);
  if (!hasAccess) {
    const error = new Error("Access denied. You are not authorized to view analytics for this project.");
    error.statusCode = 403;
    throw error;
  }

  await connectToDatabase();

  const matchFilter = { project: projectId };
  if (roundId) matchFilter.surveyRound = roundId;

  // 1. Mandals
  const mandals = await Mandal.find({
    $or: [{ projectId: projectId }, { project: projectId }],
    status: "active",
  }).select("name code");
  const mandalCoverage = [];

  for (const m of mandals) {
    const eligible = await Assignment.countDocuments({
      ...matchFilter,
      mandal: m._id,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });

    const completed = await Assignment.countDocuments({
      ...matchFilter,
      mandal: m._id,
      status: "completed",
    });

    if (eligible < MIN_GROUP_SIZE && eligible > 0) {
      mandalCoverage.push({
        id: m._id.toString(),
        name: m.name,
        code: m.code,
        suppressed: true,
        message: `Insufficient group size to display this statistic (N < ${MIN_GROUP_SIZE})`,
      });
    } else {
      mandalCoverage.push({
        id: m._id.toString(),
        name: m.name,
        code: m.code,
        eligible,
        completed,
        completionPercentage: eligible > 0 ? Number(((completed / eligible) * 100).toFixed(1)) : 0,
        suppressed: false,
      });
    }
  }

  // 2. Facilities
  const facilities = await Facility.find({
    $or: [{ projectId: projectId }, { project: projectId }],
    status: "active",
  }).select("name code serviceCategory");
  const facilityCoverage = [];

  for (const f of facilities) {
    const eligible = await Assignment.countDocuments({
      ...matchFilter,
      facility: f._id,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });

    const completed = await Assignment.countDocuments({
      ...matchFilter,
      facility: f._id,
      status: "completed",
    });

    if (eligible < MIN_GROUP_SIZE && eligible > 0) {
      facilityCoverage.push({
        id: f._id.toString(),
        name: f.name,
        code: f.code,
        serviceCategory: f.serviceCategory,
        suppressed: true,
        message: `Insufficient group size to display this statistic (N < ${MIN_GROUP_SIZE})`,
      });
    } else {
      facilityCoverage.push({
        id: f._id.toString(),
        name: f.name,
        code: f.code,
        serviceCategory: f.serviceCategory,
        eligible,
        completed,
        completionPercentage: eligible > 0 ? Number(((completed / eligible) * 100).toFixed(1)) : 0,
        suppressed: false,
      });
    }
  }

  return {
    mandals: mandalCoverage,
    facilities: facilityCoverage,
    suppressionThreshold: MIN_GROUP_SIZE,
  };
}

/**
 * Returns Baseline (M0), Midline (M3), Endline (M6) round comparison matrix.
 * Accurately evaluates question comparability across rounds.
 */
export async function getRoundComparison(user, projectId) {
  const hasAccess = await verifyDonorProjectAccess(user, projectId);
  if (!hasAccess) {
    const error = new Error("Access denied. You are not authorized to view analytics for this project.");
    error.statusCode = 403;
    throw error;
  }

  await connectToDatabase();

  const rounds = await SurveyRound.find({ project: projectId }).sort({ createdAt: 1 });
  if (rounds.length === 0) {
    return { rounds: [], comparisons: [], message: "No survey rounds configured for this project" };
  }

  const roundSummaries = [];
  for (const r of rounds) {
    const eligible = await Assignment.countDocuments({
      project: projectId,
      surveyRound: r._id,
      status: { $in: ["assigned", "in_progress", "completed"] },
    });

    const completed = await Assignment.countDocuments({
      project: projectId,
      surveyRound: r._id,
      status: "completed",
    });

    const completionPercentage = eligible > 0 ? Number(((completed / eligible) * 100).toFixed(1)) : 0;

    const stakeholderCompleted = await StakeholderTask.countDocuments({
      project: projectId,
      surveyRound: r._id,
      status: "completed",
    });

    roundSummaries.push({
      roundId: r._id.toString(),
      name: r.name,
      code: r.code,
      status: r.status,
      targetTiming: r.targetTiming,
      eligibleHouseholds: eligible,
      completedHouseholds: completed,
      completionPercentage,
      completedStakeholderInterviews: stakeholderCompleted,
    });
  }

  // Find questions configured across multiple rounds in this project
  const questions = await Question.find({ project: projectId, status: { $ne: "archived" } });

  const questionComparisons = [];

  for (const q of questions) {
    // Only analyze choice, yes_no, rating_scale, or numeric questions (never free text!)
    if (["short_text", "long_text"].includes(q.answerType)) continue;

    // Check versions to verify stability
    const versions = await QuestionVersion.find({ questionId: q._id }).sort({ versionNumber: 1 });

    // Compare question across rounds
    const roundMetrics = {};
    let isComparable = true;
    let incomparableReason = null;

    // Verify option compatibility across versions if choice
    if (versions.length > 1) {
      const v0Options = (versions[0].options || []).map((o) => `${o.code}:${o.value}`).sort().join("|");
      for (let i = 1; i < versions.length; i++) {
        const viOptions = (versions[i].options || []).map((o) => `${o.code}:${o.value}`).sort().join("|");
        if (v0Options !== viOptions || versions[0].answerType !== versions[i].answerType) {
          isComparable = false;
          incomparableReason = "Answer type or options differ materially across question versions";
          break;
        }
      }
    }

    for (const r of rounds) {
      // Fetch submitted responses for this round and question
      const responses = await SurveyResponse.find({
        project: projectId,
        surveyRound: r._id,
        status: { $in: ["submitted", "amended"] },
        "answers.questionCode": q.code,
      }).select("answers");

      const answerValues = [];
      responses.forEach((resp) => {
        const ans = (resp.answers || []).find((a) => a.questionCode === q.code);
        if (ans && ans.value !== null && ans.value !== undefined && ans.value !== "") {
          answerValues.push(ans.value);
        }
      });

      const respondentCount = answerValues.length;

      // Small group suppression (< 5)
      if (respondentCount < MIN_GROUP_SIZE) {
        roundMetrics[r.code] = {
          respondentCount,
          suppressed: true,
          message: `Insufficient group size to display this statistic (N < ${MIN_GROUP_SIZE})`,
        };
      } else {
        if (q.answerType === "yes_no") {
          const yesCount = answerValues.filter((v) => String(v).toLowerCase() === "yes" || v === true).length;
          roundMetrics[r.code] = {
            respondentCount,
            suppressed: false,
            yesCount,
            yesPercentage: Number(((yesCount / respondentCount) * 100).toFixed(1)),
          };
        } else if (q.answerType === "number" || q.answerType === "rating_scale") {
          const nums = answerValues.map(Number).filter((n) => !isNaN(n));
          const avg = nums.length > 0 ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
          roundMetrics[r.code] = {
            respondentCount,
            suppressed: false,
            average: avg,
          };
        } else if (["single_choice", "multiple_choice", "dropdown"].includes(q.answerType)) {
          const counts = {};
          answerValues.forEach((v) => {
            if (Array.isArray(v)) {
              v.forEach((item) => {
                counts[item] = (counts[item] || 0) + 1;
              });
            } else {
              counts[v] = (counts[v] || 0) + 1;
            }
          });
          roundMetrics[r.code] = {
            respondentCount,
            suppressed: false,
            optionCounts: counts,
          };
        }
      }
    }

    questionComparisons.push({
      questionCode: q.code,
      indicator: q.indicator || "",
      textEn: q.text?.en || "",
      answerType: q.answerType,
      isComparable,
      incomparableReason,
      roundMetrics,
    });
  }

  return {
    roundSummaries,
    questionComparisons,
    disclaimer: "Aggregated comparisons indicate measured survey distribution changes across rounds. They do not claim clinical causation or direct programmatic attribution.",
  };
}

/**
 * Returns question analytics for configured questions with answer type aggregation & suppression.
 */
export async function getQuestionAnalytics(user, projectId, { roundId, category } = {}) {
  const hasAccess = await verifyDonorProjectAccess(user, projectId);
  if (!hasAccess) {
    const error = new Error("Access denied. You are not authorized to view analytics for this project.");
    error.statusCode = 403;
    throw error;
  }

  await connectToDatabase();

  const questionFilter = { project: projectId, status: { $ne: "archived" } };
  if (category) questionFilter.category = category;
  if (roundId) {
    questionFilter.$or = [
      { rounds: { $exists: false } },
      { rounds: { $size: 0 } },
      { rounds: roundId },
    ];
  }

  const questions = await Question.find(questionFilter).sort({ code: 1 });

  const responseFilter = {
    project: projectId,
    status: { $in: ["submitted", "amended"] }, // drafts strictly excluded!
  };
  if (roundId) responseFilter.surveyRound = roundId;
  if (category) responseFilter.category = category;

  const responses = await SurveyResponse.find(responseFilter).select("answers category surveyRound");

  const analytics = [];

  for (const q of questions) {
    // If free text, strictly suppress content!
    if (["short_text", "long_text"].includes(q.answerType)) {
      const answeredCount = responses.filter((r) => {
        const ans = (r.answers || []).find((a) => a.questionCode === q.code);
        return ans && ans.value !== null && ans.value !== undefined && ans.value !== "";
      }).length;

      analytics.push({
        questionId: q._id.toString(),
        code: q.code,
        category: q.category,
        indicator: q.indicator || "",
        textEn: q.text?.en || "",
        answerType: q.answerType,
        freeTextSuppressed: true,
        message: "Free-text answers are protected and suppressed in donor analytics to prevent identity disclosure.",
        totalAnswered: answeredCount,
      });
      continue;
    }

    // Extract non-null answers
    const values = [];
    responses.forEach((r) => {
      const ans = (r.answers || []).find((a) => a.questionCode === q.code);
      if (ans && ans.value !== null && ans.value !== undefined && ans.value !== "") {
        values.push(ans.value);
      }
    });

    const totalRespondents = values.length;

    // Small group suppression
    if (totalRespondents < MIN_GROUP_SIZE) {
      analytics.push({
        questionId: q._id.toString(),
        code: q.code,
        category: q.category,
        indicator: q.indicator || "",
        textEn: q.text?.en || "",
        answerType: q.answerType,
        totalRespondents,
        suppressed: true,
        message: `Insufficient group size to display this statistic (N < ${MIN_GROUP_SIZE})`,
      });
      continue;
    }

    let summary = {};

    if (q.answerType === "yes_no") {
      const yesCount = values.filter((v) => String(v).toLowerCase() === "yes" || v === true).length;
      const noCount = totalRespondents - yesCount;
      summary = {
        type: "yes_no",
        yesCount,
        yesPercentage: Number(((yesCount / totalRespondents) * 100).toFixed(1)),
        noCount,
        noPercentage: Number(((noCount / totalRespondents) * 100).toFixed(1)),
      };
    } else if (["single_choice", "dropdown"].includes(q.answerType)) {
      const optionCounts = {};
      (q.options || []).forEach((opt) => {
        optionCounts[opt.code] = {
          code: opt.code,
          label: opt.textEn,
          count: 0,
          percentage: 0,
        };
      });

      values.forEach((v) => {
        const key = String(v);
        if (optionCounts[key]) {
          optionCounts[key].count += 1;
        } else {
          optionCounts[key] = { code: key, label: key, count: 1, percentage: 0 };
        }
      });

      Object.values(optionCounts).forEach((opt) => {
        opt.percentage = Number(((opt.count / totalRespondents) * 100).toFixed(1));
      });

      summary = {
        type: "single_choice",
        options: Object.values(optionCounts),
      };
    } else if (q.answerType === "multiple_choice") {
      const selectionCounts = {};
      (q.options || []).forEach((opt) => {
        selectionCounts[opt.code] = {
          code: opt.code,
          label: opt.textEn,
          count: 0,
          respondentPercentage: 0,
        };
      });

      values.forEach((val) => {
        const arr = Array.isArray(val) ? val : [val];
        arr.forEach((v) => {
          const key = String(v);
          if (selectionCounts[key]) {
            selectionCounts[key].count += 1;
          } else {
            selectionCounts[key] = { code: key, label: key, count: 1, respondentPercentage: 0 };
          }
        });
      });

      Object.values(selectionCounts).forEach((opt) => {
        opt.respondentPercentage = Number(((opt.count / totalRespondents) * 100).toFixed(1));
      });

      summary = {
        type: "multiple_choice",
        options: Object.values(selectionCounts),
        note: "Respondents may select multiple options; percentages reflect proportion of respondents and may sum to > 100%.",
      };
    } else if (q.answerType === "number" || q.answerType === "rating_scale") {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        summary = {
          type: q.answerType,
          average: Number((sum / nums.length).toFixed(2)),
          minimum: Math.min(...nums),
          maximum: Math.max(...nums),
          count: nums.length,
        };
      } else {
        summary = { type: q.answerType, count: 0, average: 0 };
      }
    }

    analytics.push({
      questionId: q._id.toString(),
      code: q.code,
      category: q.category,
      indicator: q.indicator || "",
      textEn: q.text?.en || "",
      answerType: q.answerType,
      totalRespondents,
      suppressed: false,
      summary,
    });
  }

  return {
    analytics,
    suppressionThreshold: MIN_GROUP_SIZE,
    totalQuestions: analytics.length,
  };
}

/**
 * Generates an aggregated CSV impact report with formula injection mitigation and privacy suppression.
 */
export async function exportDonorReportCsv(user, projectId, { roundId = null } = {}) {
  const overview = await getProjectImpactOverview(user, projectId, roundId);
  const geo = await getGeographicCoverage(user, projectId, { roundId });
  const questionData = await getQuestionAnalytics(user, projectId, { roundId });

  const rows = [];

  // Header Section
  rows.push([sanitizeCsvValue("DONOR IMPACT & SURVEY MONITORING REPORT")]);
  rows.push([sanitizeCsvValue("Project Code:"), sanitizeCsvValue(overview.project.code)]);
  rows.push([sanitizeCsvValue("Project Name:"), sanitizeCsvValue(overview.project.name)]);
  rows.push([sanitizeCsvValue("Generated At:"), sanitizeCsvValue(new Date().toISOString())]);
  rows.push([sanitizeCsvValue("Filter Round:"), sanitizeCsvValue(roundId ? roundId : "All Rounds")]);
  rows.push([sanitizeCsvValue("Confidentiality Notice:"), sanitizeCsvValue("Aggregated data only. Household PII and free-text answers are strictly suppressed.")]);
  rows.push([]);

  // Section 1: Household Survey Coverage
  rows.push([sanitizeCsvValue("SECTION 1: HOUSEHOLD SURVEY COVERAGE")]);
  rows.push([
    sanitizeCsvValue("Metric"),
    sanitizeCsvValue("Count"),
    sanitizeCsvValue("Percentage"),
    sanitizeCsvValue("Notes"),
  ]);
  rows.push([
    sanitizeCsvValue("Total Eligible Assignments"),
    sanitizeCsvValue(overview.householdCoverage.totalEligible),
    sanitizeCsvValue("100%"),
    sanitizeCsvValue("Denominator: Assigned + In-Progress + Completed. Cancelled excluded."),
  ]);
  rows.push([
    sanitizeCsvValue("Completed Household Surveys"),
    sanitizeCsvValue(overview.householdCoverage.completed),
    sanitizeCsvValue(`${overview.householdCoverage.completionPercentage}%`),
    sanitizeCsvValue("Verified submitted survey responses"),
  ]);
  rows.push([
    sanitizeCsvValue("In-Progress Surveys"),
    sanitizeCsvValue(overview.householdCoverage.inProgress),
    sanitizeCsvValue(
      overview.householdCoverage.totalEligible > 0
        ? `${((overview.householdCoverage.inProgress / overview.householdCoverage.totalEligible) * 100).toFixed(1)}%`
        : "0%"
    ),
    sanitizeCsvValue("Active fieldwork"),
  ]);
  rows.push([
    sanitizeCsvValue("Cancelled Tasks"),
    sanitizeCsvValue(overview.householdCoverage.cancelled),
    sanitizeCsvValue("N/A"),
    sanitizeCsvValue("Excluded from denominator"),
  ]);
  rows.push([]);

  // Section 2: Stakeholder Interview Coverage
  rows.push([sanitizeCsvValue("SECTION 2: STAKEHOLDER INTERVIEWS (SEPARATE FROM HOUSEHOLD)")]);
  rows.push([
    sanitizeCsvValue("Category"),
    sanitizeCsvValue("Eligible Interviews"),
    sanitizeCsvValue("Completed"),
    sanitizeCsvValue("Completion Rate"),
  ]);
  for (const [cat, data] of Object.entries(overview.stakeholderInterviews)) {
    rows.push([
      sanitizeCsvValue(cat.toUpperCase().replace(/_/g, " ")),
      sanitizeCsvValue(data.eligible),
      sanitizeCsvValue(data.completed),
      sanitizeCsvValue(`${data.completionPercentage}%`),
    ]);
  }
  rows.push([]);

  // Section 3: Geographic Coverage with Small Group Suppression
  rows.push([sanitizeCsvValue("SECTION 3: GEOGRAPHIC COVERAGE (MANDAL LEVEL)")]);
  rows.push([
    sanitizeCsvValue("Mandal Name"),
    sanitizeCsvValue("Mandal Code"),
    sanitizeCsvValue("Eligible Households"),
    sanitizeCsvValue("Completed Surveys"),
    sanitizeCsvValue("Completion Rate"),
    sanitizeCsvValue("Privacy Status"),
  ]);
  for (const m of geo.mandals) {
    if (m.suppressed) {
      rows.push([
        sanitizeCsvValue(m.name),
        sanitizeCsvValue(m.code),
        sanitizeCsvValue("[Suppressed - N < 5]"),
        sanitizeCsvValue("[Suppressed - N < 5]"),
        sanitizeCsvValue("[Suppressed - N < 5]"),
        sanitizeCsvValue(m.message),
      ]);
    } else {
      rows.push([
        sanitizeCsvValue(m.name),
        sanitizeCsvValue(m.code),
        sanitizeCsvValue(m.eligible),
        sanitizeCsvValue(m.completed),
        sanitizeCsvValue(`${m.completionPercentage}%`),
        sanitizeCsvValue("Reported"),
      ]);
    }
  }
  rows.push([]);

  // Section 4: Aggregate Question Statistics (No PII, No Free Text, Suppressed if < 5)
  rows.push([sanitizeCsvValue("SECTION 4: AGGREGATE QUESTION STATISTICS")]);
  rows.push([
    sanitizeCsvValue("Question Code"),
    sanitizeCsvValue("Category"),
    sanitizeCsvValue("Indicator"),
    sanitizeCsvValue("Question Text"),
    sanitizeCsvValue("Answer Type"),
    sanitizeCsvValue("Total Respondents"),
    sanitizeCsvValue("Summary / Result"),
  ]);

  for (const q of questionData.analytics) {
    if (q.freeTextSuppressed) {
      rows.push([
        sanitizeCsvValue(q.code),
        sanitizeCsvValue(q.category),
        sanitizeCsvValue(q.indicator),
        sanitizeCsvValue(q.textEn),
        sanitizeCsvValue(q.answerType),
        sanitizeCsvValue(q.totalAnswered),
        sanitizeCsvValue("[Protected Free Text - Suppressed]"),
      ]);
    } else if (q.suppressed) {
      rows.push([
        sanitizeCsvValue(q.code),
        sanitizeCsvValue(q.category),
        sanitizeCsvValue(q.indicator),
        sanitizeCsvValue(q.textEn),
        sanitizeCsvValue(q.answerType),
        sanitizeCsvValue(q.totalRespondents),
        sanitizeCsvValue("[Suppressed - N < 5]"),
      ]);
    } else if (q.summary?.type === "yes_no") {
      rows.push([
        sanitizeCsvValue(q.code),
        sanitizeCsvValue(q.category),
        sanitizeCsvValue(q.indicator),
        sanitizeCsvValue(q.textEn),
        sanitizeCsvValue(q.answerType),
        sanitizeCsvValue(q.totalRespondents),
        sanitizeCsvValue(`Yes: ${q.summary.yesCount} (${q.summary.yesPercentage}%), No: ${q.summary.noCount} (${q.summary.noPercentage}%)`),
      ]);
    } else if (q.summary?.type === "number" || q.summary?.type === "rating_scale") {
      rows.push([
        sanitizeCsvValue(q.code),
        sanitizeCsvValue(q.category),
        sanitizeCsvValue(q.indicator),
        sanitizeCsvValue(q.textEn),
        sanitizeCsvValue(q.answerType),
        sanitizeCsvValue(q.totalRespondents),
        sanitizeCsvValue(`Average: ${q.summary.average}, Min: ${q.summary.minimum}, Max: ${q.summary.maximum}`),
      ]);
    } else if (q.summary?.type === "single_choice" || q.summary?.type === "multiple_choice") {
      const breakdown = (q.summary.options || [])
        .map((opt) => `${opt.label}: ${opt.count} (${opt.percentage || opt.respondentPercentage}%)`)
        .join("; ");
      rows.push([
        sanitizeCsvValue(q.code),
        sanitizeCsvValue(q.category),
        sanitizeCsvValue(q.indicator),
        sanitizeCsvValue(q.textEn),
        sanitizeCsvValue(q.answerType),
        sanitizeCsvValue(q.totalRespondents),
        sanitizeCsvValue(breakdown),
      ]);
    }
  }
  rows.push([]);

  // Section 5: Data Quality Summary Counts
  rows.push([sanitizeCsvValue("SECTION 5: DATA QUALITY SUMMARY")]);
  rows.push([sanitizeCsvValue("Severity"), sanitizeCsvValue("Active Issue Count"), sanitizeCsvValue("Status Note")]);
  rows.push([sanitizeCsvValue("Critical"), sanitizeCsvValue(overview.dataQualitySummary.severityCounts.critical), sanitizeCsvValue("Integrity or Auth anomalies")]);
  rows.push([sanitizeCsvValue("High"), sanitizeCsvValue(overview.dataQualitySummary.severityCounts.high), sanitizeCsvValue("Business validation violations")]);
  rows.push([sanitizeCsvValue("Medium"), sanitizeCsvValue(overview.dataQualitySummary.severityCounts.medium), sanitizeCsvValue("Inconsistencies requiring attention")]);
  rows.push([sanitizeCsvValue("Low"), sanitizeCsvValue(overview.dataQualitySummary.severityCounts.low), sanitizeCsvValue("Non-blocking warnings")]);

  const csvString = rows.map((r) => r.join(",")).join("\r\n");

  // Log report export audit
  await logAudit({
    actor: user,
    entityType: "Project",
    entityId: projectId,
    action: "EXPORT",
    before: null,
    after: {
      reportType: "donor_impact_summary_csv",
      roundId: roundId || "all",
      exportedAt: new Date(),
    },
  });

  return csvString;
}
