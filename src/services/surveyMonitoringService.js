import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import Family from "@/models/Family";
import User from "@/models/User";

/**
 * Calculates survey monitoring dashboard metrics from real database records.
 * Uses strict, clearly-defined denominators and separates family assignments from stakeholder tasks.
 */
export async function getMonitoringMetrics({
  projectId = "",
  surveyRoundId = "",
  category = "",
  fieldWorkerId = "",
  assignmentStatus = "",
  responseStatus = "",
  startDate = "",
  endDate = "",
} = {}) {
  await connectToDatabase();

  // 1. Build Base Match Filters
  const assignmentQuery = {};
  const responseQuery = {};
  const stakeholderQuery = {};

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    const projId = new mongoose.Types.ObjectId(projectId);
    assignmentQuery.project = projId;
    responseQuery.project = projId;
    stakeholderQuery.project = projId;
  }

  if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
    const roundId = new mongoose.Types.ObjectId(surveyRoundId);
    assignmentQuery.surveyRound = roundId;
    responseQuery.surveyRound = roundId;
    stakeholderQuery.surveyRound = roundId;
  }

  if (fieldWorkerId && mongoose.Types.ObjectId.isValid(fieldWorkerId)) {
    const workerId = new mongoose.Types.ObjectId(fieldWorkerId);
    assignmentQuery.fieldWorker = workerId;
    responseQuery.fieldWorker = workerId;
    stakeholderQuery.fieldWorker = workerId;
  }

  if (category) {
    responseQuery.category = category;
    if (category !== "family") {
      stakeholderQuery.category = category;
    }
  }

  if (assignmentStatus) {
    assignmentQuery.status = assignmentStatus;
    stakeholderQuery.status = assignmentStatus;
  }

  if (responseStatus) {
    responseQuery.status = responseStatus;
  }

  // Date range filters based on creation/submission
  if (startDate || endDate) {
    const dateRange = {};
    if (startDate) dateRange.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    assignmentQuery.createdAt = dateRange;
    responseQuery.createdAt = dateRange;
    stakeholderQuery.createdAt = dateRange;
  }

  // If specific category is selected and is NOT 'family', family assignment counts are 0
  const isFamilyCategory = !category || category === "family";

  // 2. Family Assignment Metrics (Denominator: Active eligible assignments = assigned + in_progress + completed)
  let assignedTasks = 0;
  let inProgressTasks = 0;
  let completedTasks = 0;
  let cancelledTasks = 0;
  let totalEligibleAssignments = 0;

  if (isFamilyCategory) {
    const assignmentAgg = await Assignment.aggregate([
      { $match: assignmentQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    for (const item of assignmentAgg) {
      if (item._id === "assigned") assignedTasks = item.count;
      else if (item._id === "in_progress") inProgressTasks = item.count;
      else if (item._id === "completed") completedTasks = item.count;
      else if (item._id === "cancelled") cancelledTasks = item.count;
    }

    // Cancelled tasks are excluded from completion denominator
    totalEligibleAssignments = assignedTasks + inProgressTasks + completedTasks;
  }

  const completionPercentage =
    totalEligibleAssignments > 0
      ? Number(((completedTasks / totalEligibleAssignments) * 100).toFixed(1))
      : 0;

  // 3. Response Metrics (Draft vs Submitted vs Amended)
  let draftResponses = 0;
  let submittedResponses = 0;
  let amendedResponses = 0;

  const responseAgg = await SurveyResponse.aggregate([
    { $match: responseQuery },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  for (const item of responseAgg) {
    if (item._id === "draft") draftResponses = item.count;
    else if (item._id === "submitted") submittedResponses = item.count;
    else if (item._id === "amended") amendedResponses = item.count;
  }

  const totalSubmittedResponses = submittedResponses + amendedResponses;

  // 4. Stakeholder Task Metrics (Strictly separated from family tasks)
  let stakeholderCompleted = 0;
  let stakeholderOutstanding = 0;
  let stakeholderCancelled = 0;

  if (!category || category !== "family") {
    const stakeholderAgg = await StakeholderTask.aggregate([
      { $match: stakeholderQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    for (const item of stakeholderAgg) {
      if (item._id === "completed") stakeholderCompleted = item.count;
      else if (item._id === "assigned" || item._id === "in_progress") {
        stakeholderOutstanding += item.count;
      } else if (item._id === "cancelled") {
        stakeholderCancelled = item.count;
      }
    }
  }

  // 5. Families Not Yet Interviewed (Active families with no completed assignment in this round/project)
  let familiesNotYetInterviewed = 0;
  if (isFamilyCategory && projectId) {
    const familyQuery = { project: new mongoose.Types.ObjectId(projectId), status: "active" };
    const totalActiveFamilies = await Family.countDocuments(familyQuery);

    const completedFamilyIds = await Assignment.distinct("family", {
      project: new mongoose.Types.ObjectId(projectId),
      ...(surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)
        ? { surveyRound: new mongoose.Types.ObjectId(surveyRoundId) }
        : {}),
      status: "completed",
    });

    familiesNotYetInterviewed = Math.max(0, totalActiveFamilies - completedFamilyIds.length);
  }

  // 6. Data Presence Check
  const hasData =
    totalEligibleAssignments > 0 ||
    cancelledTasks > 0 ||
    draftResponses > 0 ||
    totalSubmittedResponses > 0 ||
    stakeholderCompleted > 0 ||
    stakeholderOutstanding > 0;

  return {
    hasData,
    familyAssignments: {
      totalEligible: totalEligibleAssignments,
      assigned: assignedTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      cancelled: cancelledTasks,
      completionPercentage,
      familiesNotYetInterviewed,
    },
    responses: {
      draft: draftResponses,
      submitted: submittedResponses,
      amended: amendedResponses,
      totalSubmitted: totalSubmittedResponses,
    },
    stakeholderTasks: {
      completed: stakeholderCompleted,
      outstanding: stakeholderOutstanding,
      cancelled: stakeholderCancelled,
    },
    filters: {
      projectId: projectId || null,
      surveyRoundId: surveyRoundId || null,
      category: category || "all",
      fieldWorkerId: fieldWorkerId || "all",
      assignmentStatus: assignmentStatus || "all",
      responseStatus: responseStatus || "all",
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
}

/**
 * Breakdown of workload, status, and completion by Field Worker.
 */
export async function getFieldWorkerProgress({ projectId = "", surveyRoundId = "" } = {}) {
  await connectToDatabase();

  const matchScope = {};
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    matchScope.project = new mongoose.Types.ObjectId(projectId);
  }
  if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
    matchScope.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);
  }

  // Fetch all active field workers
  const fieldWorkers = await User.find({ role: "field_worker", status: "active" })
    .select("name email phone")
    .sort({ name: 1 })
    .lean();

  // Aggregate assignments by worker
  const assignmentAgg = await Assignment.aggregate([
    { $match: matchScope },
    {
      $group: {
        _id: { fieldWorker: "$fieldWorker", status: "$status" },
        count: { $sum: 1 },
        lastCompleted: { $max: "$completedAt" },
        lastStarted: { $max: "$startedAt" },
      },
    },
  ]);

  // Aggregate stakeholder tasks by worker
  const stakeholderAgg = await StakeholderTask.aggregate([
    { $match: matchScope },
    {
      $group: {
        _id: { fieldWorker: "$fieldWorker", status: "$status" },
        count: { $sum: 1 },
        lastCompleted: { $max: "$completedAt" },
      },
    },
  ]);

  // Aggregate response last saved/submitted by worker
  const responseAgg = await SurveyResponse.aggregate([
    { $match: matchScope },
    {
      $group: {
        _id: "$fieldWorker",
        lastSaved: { $max: "$lastSavedAt" },
        lastSubmitted: { $max: "$submittedAt" },
      },
    },
  ]);

  const respMap = new Map();
  for (const r of responseAgg) {
    if (r._id) {
      respMap.set(r._id.toString(), {
        lastSaved: r.lastSaved,
        lastSubmitted: r.lastSubmitted,
      });
    }
  }

  // Build worker stats map
  const workerStatsMap = new Map();
  for (const worker of fieldWorkers) {
    workerStatsMap.set(worker._id.toString(), {
      workerId: worker._id.toString(),
      name: worker.name,
      email: worker.email,
      phone: worker.phone
        ? worker.phone.slice(0, 4) + "******" + worker.phone.slice(-2)
        : "N/A",
      assignedTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      cancelledTasks: 0,
      stakeholderCompleted: 0,
      stakeholderOutstanding: 0,
      lastActivityAt: null,
    });
  }

  for (const item of assignmentAgg) {
    if (!item._id.fieldWorker) continue;
    const wid = item._id.fieldWorker.toString();
    const stats = workerStatsMap.get(wid);
    if (!stats) continue;

    if (item._id.status === "assigned") stats.assignedTasks += item.count;
    else if (item._id.status === "in_progress") stats.inProgressTasks += item.count;
    else if (item._id.status === "completed") stats.completedTasks += item.count;
    else if (item._id.status === "cancelled") stats.cancelledTasks += item.count;

    const candidateTime = item.lastCompleted || item.lastStarted;
    if (candidateTime) {
      if (!stats.lastActivityAt || new Date(candidateTime) > new Date(stats.lastActivityAt)) {
        stats.lastActivityAt = candidateTime;
      }
    }
  }

  for (const item of stakeholderAgg) {
    if (!item._id.fieldWorker) continue;
    const wid = item._id.fieldWorker.toString();
    const stats = workerStatsMap.get(wid);
    if (!stats) continue;

    if (item._id.status === "completed") stats.stakeholderCompleted += item.count;
    else if (item._id.status === "assigned" || item._id.status === "in_progress") {
      stats.stakeholderOutstanding += item.count;
    }

    if (item.lastCompleted) {
      if (!stats.lastActivityAt || new Date(item.lastCompleted) > new Date(stats.lastActivityAt)) {
        stats.lastActivityAt = item.lastCompleted;
      }
    }
  }

  // Cross check with response timestamps
  for (const [wid, stats] of workerStatsMap.entries()) {
    const respTimes = respMap.get(wid);
    if (respTimes) {
      const latestResp = respTimes.lastSubmitted || respTimes.lastSaved;
      if (latestResp) {
        if (!stats.lastActivityAt || new Date(latestResp) > new Date(stats.lastActivityAt)) {
          stats.lastActivityAt = latestResp;
        }
      }
    }
  }

  // Calculate percentages and outstanding counts
  const results = [];
  for (const stats of workerStatsMap.values()) {
    const outstandingTasks = stats.assignedTasks + stats.inProgressTasks;
    const totalActiveTasks = stats.assignedTasks + stats.inProgressTasks + stats.completedTasks;
    const completionPercentage =
      totalActiveTasks > 0
        ? Number(((stats.completedTasks / totalActiveTasks) * 100).toFixed(1))
        : 0;

    results.push({
      ...stats,
      outstandingTasks,
      totalActiveTasks,
      completionPercentage,
    });
  }

  // Sort by completed tasks descending, then name
  results.sort((a, b) => b.completedTasks - a.completedTasks || a.name.localeCompare(b.name));

  return results;
}
