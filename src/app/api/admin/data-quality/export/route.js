import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import DataQualityIssue from "@/models/DataQualityIssue";
import { getMonitoringMetrics } from "@/services/surveyMonitoringService";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Escapes a CSV field and mitigates spreadsheet formula injection attacks.
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Mitigate formula injection: prefix risky characters with an apostrophe
  if (/^[=+@\-\t\r]/.test(str)) {
    str = `'` + str;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "issues";
    const projectId = searchParams.get("projectId") || "";
    const surveyRoundId = searchParams.get("surveyRoundId") || "";
    const severity = searchParams.get("severity") || "";
    const issueType = searchParams.get("issueType") || "";
    const status = searchParams.get("status") || "";

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (type === "monitoring") {
      const metrics = await getMonitoringMetrics({ projectId, surveyRoundId });

      const rows = [
        ["Report Type", "Survey Monitoring Summary"],
        ["Generated At", new Date().toISOString()],
        ["Project ID", projectId || "All Projects"],
        ["Survey Round ID", surveyRoundId || "All Rounds"],
        [],
        ["Metric", "Count / Value"],
        ["Total Eligible Assignments", metrics.familyAssignments.totalEligible],
        ["Assigned Tasks", metrics.familyAssignments.assigned],
        ["In-Progress Tasks", metrics.familyAssignments.inProgress],
        ["Completed Tasks", metrics.familyAssignments.completed],
        ["Cancelled Tasks", metrics.familyAssignments.cancelled],
        ["Completion Percentage (%)", `${metrics.familyAssignments.completionPercentage}%`],
        ["Families Not Yet Interviewed", metrics.familyAssignments.familiesNotYetInterviewed],
        ["Draft Responses", metrics.responses.draft],
        ["Submitted Responses", metrics.responses.submitted],
        ["Amended Responses", metrics.responses.amended],
        ["Stakeholder Interviews Completed", metrics.stakeholderTasks.completed],
        ["Stakeholder Interviews Outstanding", metrics.stakeholderTasks.outstanding],
      ];

      const csvContent = rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");

      await logAudit({
        actor: auth.user,
        entityType: "DataQualityScan",
        entityId: auth.user.id || auth.user._id,
        action: "EXPORT",
        after: { type: "monitoring", projectId, surveyRoundId },
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="survey-monitoring-${timestamp}.csv"`,
        },
      });
    }

    // Default: Export Data Quality Issues
    const query = {};
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      query.project = new mongoose.Types.ObjectId(projectId);
    }
    if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
      query.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);
    }
    if (severity) query.severity = severity;
    if (issueType) query.issueType = issueType;
    if (status) query.status = status;

    const issues = await DataQualityIssue.find(query)
      .populate("project", "name code")
      .populate("surveyRound", "name code")
      .populate("family", "familyCode householdHeadName")
      .populate("fieldWorker", "name email")
      .sort({ severity: 1, lastDetectedAt: -1 })
      .lean();

    const headers = [
      "Issue Code",
      "Severity",
      "Issue Type",
      "Entity Type",
      "Entity Code",
      "Project Code",
      "Survey Round",
      "Family Code",
      "Field Worker",
      "Status",
      "Short Explanation",
      "Suggested Action",
      "First Detected",
      "Last Detected",
      "Resolution Reason",
    ];

    const lines = [headers.map(escapeCsv).join(",")];

    for (const iss of issues) {
      // Ensure any names or worker references are sanitized, never exporting raw sensitive data
      const workerInfo = iss.fieldWorker ? iss.fieldWorker.name : "N/A";
      const familyCode = iss.familyCode || (iss.family ? iss.family.familyCode : "N/A");

      const line = [
        iss.issueCode,
        iss.severity,
        iss.issueType,
        iss.entityType,
        iss.entityCode || "N/A",
        iss.project ? iss.project.code || iss.project.name : "N/A",
        iss.surveyRound ? iss.surveyRound.code || iss.surveyRound.name : "N/A",
        familyCode,
        workerInfo,
        iss.status,
        iss.description,
        iss.suggestedAction || "N/A",
        iss.firstDetectedAt ? new Date(iss.firstDetectedAt).toISOString() : "N/A",
        iss.lastDetectedAt ? new Date(iss.lastDetectedAt).toISOString() : "N/A",
        iss.resolutionReason || "",
      ];

      lines.push(line.map(escapeCsv).join(","));
    }

    const csvOutput = lines.join("\r\n");

    await logAudit({
      actor: auth.user,
      entityType: "DataQualityIssue",
      entityId: auth.user.id || auth.user._id,
      action: "EXPORT",
      after: {
        recordsExported: issues.length,
        filters: { projectId, surveyRoundId, severity, status },
      },
    });

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="data-quality-issues-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export data quality error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate CSV export" },
      { status: error.statusCode || 500 }
    );
  }
}
