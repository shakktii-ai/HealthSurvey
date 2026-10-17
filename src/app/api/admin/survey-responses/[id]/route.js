import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import SurveyResponse from "@/models/SurveyResponse";
import DataQualityIssue from "@/models/DataQualityIssue";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid response ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const response = await SurveyResponse.findById(id)
      .populate("project", "name code")
      .populate("surveyRound", "name code enableLightTouch")
      .populate("fieldWorker", "name email phone")
      .populate("family", "familyCode householdHeadName village mandal facility status")
      .populate("stakeholder", "fullName stakeholderType designation phone")
      .populate("assignment", "assignmentCode status startedAt completedAt")
      .populate("stakeholderTask", "taskCode status startedAt completedAt")
      .populate("revisionHistory.amendedBy", "name email")
      .lean();

    if (!response) {
      return NextResponse.json(
        { success: false, error: "Survey response not found" },
        { status: 404 }
      );
    }

    // Query linked data quality issues
    const linkedIssues = await DataQualityIssue.find({
      entityId: response._id,
      status: { $in: ["detected", "acknowledged"] },
    })
      .select("issueCode issueType severity description status")
      .lean();

    const { searchParams } = new URL(request.url);
    const revealSensitive = searchParams.get("revealSensitive") === "true";

    const formatted = {
      ...response,
      id: response._id.toString(),
      linkedIssues,
    };

    if (revealSensitive) {
      // Audit sensitive PII reveal action
      await logAudit({
        actor: auth.user,
        entityType: "SurveyResponse",
        entityId: response._id,
        action: "INSPECT",
        after: {
          action: "REVEAL_PII",
          responseCode: response.responseCode,
          familyCode: response.family?.familyCode || "",
        },
      });
    } else {
      // Mask PII by default
      if (formatted.respondentName) {
        formatted.respondentName = formatted.respondentName.charAt(0) + "*** (Masked)";
      }
      if (formatted.family?.householdHeadName) {
        formatted.family.householdHeadName =
          formatted.family.householdHeadName.charAt(0) + "*** (Masked)";
      }
      if (formatted.fieldWorker?.phone) {
        formatted.fieldWorker.phone =
          formatted.fieldWorker.phone.slice(0, 4) + "******" + formatted.fieldWorker.phone.slice(-2);
      }
      if (formatted.stakeholder?.phone) {
        formatted.stakeholder.phone =
          formatted.stakeholder.phone.slice(0, 4) + "******" + formatted.stakeholder.phone.slice(-2);
      }
    }

    return NextResponse.json({ success: true, item: formatted }, { status: 200 });
  } catch (error) {
    console.error("Get survey response details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load response details" },
      { status: error.statusCode || 500 }
    );
  }
}
