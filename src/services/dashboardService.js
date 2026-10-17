import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/Project";
import Mandal from "@/models/Mandal";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import Stakeholder from "@/models/Stakeholder";
import Family from "@/models/Family";
import User from "@/models/User";
import SurveyRound from "@/models/SurveyRound";
import Question from "@/models/Question";
import Assignment from "@/models/Assignment";
import StakeholderTask from "@/models/StakeholderTask";
import SurveyResponse from "@/models/SurveyResponse";
import DataQualityIssue from "@/models/DataQualityIssue";
import AuditLog from "@/models/AuditLog";

/**
 * Fetch real, production-ready operational metrics for the administrative dashboard.
 * All data is drawn from existing MongoDB models without hardcoded statistics or PII leakage.
 */
export async function getDashboardMetrics() {
  await connectToDatabase();

  try {
    // 1. Run core counts in parallel
    const [
      totalProjects,
      totalVillages,
      totalFamilies,
      activeFamilies,
      totalFieldWorkers,
      activeSurveyRounds,
      pendingAssignments,
      inProgressAssignments,
      completedAssignments,
      cancelledAssignments,
      totalAssignments,
      completedResponses,
      draftResponses,
      unresolvedQualityIssues,
      resolvedQualityIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      totalMandals,
      totalFacilities,
      totalStakeholders,
      totalQuestions,
      activeQuestions,
    ] = await Promise.all([
      Project.countDocuments(),
      Village.countDocuments(),
      Family.countDocuments(),
      Family.countDocuments({ status: "active" }),
      User.countDocuments({ role: "field_worker", status: "active" }),
      SurveyRound.countDocuments({ status: "active" }),
      Assignment.countDocuments({ status: { $in: ["assigned", "pending"] } }),
      Assignment.countDocuments({ status: "in_progress" }),
      Assignment.countDocuments({ status: "completed" }),
      Assignment.countDocuments({ status: { $in: ["cancelled", "not_required"] } }),
      Assignment.countDocuments(),
      SurveyResponse.countDocuments({ status: { $in: ["submitted", "completed", "amended"] } }),
      SurveyResponse.countDocuments({ status: "draft" }),
      DataQualityIssue.countDocuments({ status: { $in: ["open", "flagged", "acknowledged"] } }),
      DataQualityIssue.countDocuments({ status: "resolved" }),
      DataQualityIssue.countDocuments({ status: { $in: ["open", "flagged", "acknowledged"] }, severity: "critical" }),
      DataQualityIssue.countDocuments({ status: { $in: ["open", "flagged", "acknowledged"] }, severity: "high" }),
      DataQualityIssue.countDocuments({ status: { $in: ["open", "flagged", "acknowledged"] }, severity: "medium" }),
      DataQualityIssue.countDocuments({ status: { $in: ["open", "flagged", "acknowledged"] }, severity: "low" }),
      Mandal.countDocuments(),
      Facility.countDocuments(),
      Stakeholder.countDocuments(),
      Question.countDocuments(),
      Question.countDocuments({ status: "active" }),
    ]);

    // 2. Fetch Survey Rounds with round-by-round progress breakdown
    const surveyRoundsDocs = await SurveyRound.find()
      .populate("project", "name code")
      .sort({ createdAt: 1 })
      .lean();

    const surveyProgress = await Promise.all(
      surveyRoundsDocs.map(async (round) => {
        const [rTotal, rCompleted, rInProgress, rPending] = await Promise.all([
          Assignment.countDocuments({ surveyRound: round._id }),
          Assignment.countDocuments({ surveyRound: round._id, status: "completed" }),
          Assignment.countDocuments({ surveyRound: round._id, status: "in_progress" }),
          Assignment.countDocuments({ surveyRound: round._id, status: { $in: ["assigned", "pending"] } }),
        ]);

        const completionPct = rTotal > 0 ? Math.round((rCompleted / rTotal) * 100) : 0;

        return {
          id: round._id.toString(),
          code: round.code,
          name: round.name,
          targetTiming: round.targetTiming || "",
          status: round.status,
          enableLightTouch: Boolean(round.enableLightTouch),
          projectName: round.project?.name || "General",
          projectCode: round.project?.code || "",
          totalAssignments: rTotal,
          completed: rCompleted,
          inProgress: rInProgress,
          pending: rPending,
          completionRate: completionPct,
        };
      })
    );

    // 3. Fetch Recent Administrative Activity (Audit Log) - PII safe
    const recentAuditLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const recentActivity = recentAuditLogs.map((log) => {
      let description = `${log.action} on ${log.entityType}`;
      if (log.action === "CREATE") description = `New ${log.entityType} registered`;
      if (log.action === "STATUS_CHANGE") description = `${log.entityType} status transitioned`;
      if (log.action === "UPDATE") description = `${log.entityType} record updated`;
      if (log.action === "RESOLVE") description = `Data quality issue resolved`;
      if (log.action === "ACKNOWLEDGE") description = `Data quality anomaly acknowledged`;
      if (log.action === "AMEND") description = `Survey response post-submission amendment`;
      if (log.action === "SCAN_COMPLETE") description = `Automated data quality scan completed`;

      return {
        id: log._id.toString(),
        actorEmail: log.actorEmail || "System",
        action: log.action,
        entityType: log.entityType,
        description,
        timestamp: log.createdAt,
      };
    });

    return {
      summary: {
        totalProjects,
        totalVillages,
        totalFamilies,
        activeFamilies,
        totalFieldWorkers,
        activeSurveyRounds,
        pendingAssignments,
        inProgressAssignments,
        completedAssignments,
        totalAssignments,
        completedResponses,
        draftResponses,
        unresolvedQualityIssues,
        resolvedQualityIssues,
        qualityIssuesBySeverity: {
          critical: criticalIssues,
          high: highIssues,
          medium: mediumIssues,
          low: lowIssues,
        },
        masterData: {
          mandals: totalMandals,
          facilities: totalFacilities,
          stakeholders: totalStakeholders,
          questionsTotal: totalQuestions,
          questionsActive: activeQuestions,
        },
      },
      surveyProgress,
      recentActivity,
      assignmentOverview: {
        total: totalAssignments,
        assigned: pendingAssignments,
        inProgress: inProgressAssignments,
        completed: completedAssignments,
        cancelled: cancelledAssignments,
        completionRate:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
      },
      dataQualityOverview: {
        unresolved: unresolvedQualityIssues,
        resolved: resolvedQualityIssues,
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues,
      },
    };
  } catch (error) {
    console.error("Dashboard metrics aggregation error:", error);
    throw error;
  }
}
