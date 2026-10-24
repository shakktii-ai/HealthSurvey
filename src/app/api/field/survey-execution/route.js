import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getExecutionSurveyData,
  updateSurveyStakeholder,
} from "@/services/surveyExecutionService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId") || "";
    const stakeholderTaskId = searchParams.get("stakeholderTaskId") || "";

    const category = searchParams.get("category") || "";

    if (!assignmentId && !stakeholderTaskId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either assignmentId or stakeholderTaskId query parameter is required.",
        },
        { status: 400 }
      );
    }

    const session = await getExecutionSurveyData(
      { assignmentId, stakeholderTaskId, category },
      auth.user
    );

    return NextResponse.json({ success: true, ...session }, { status: 200 });
  } catch (error) {
    console.error("Survey execution session error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load survey session" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { assignmentId, stakeholderTaskId, stakeholderId } = body;

    if (!stakeholderId) {
      return NextResponse.json(
        { success: false, error: "stakeholderId parameter is required." },
        { status: 400 }
      );
    }

    if (!assignmentId && !stakeholderTaskId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either assignmentId or stakeholderTaskId parameter is required.",
        },
        { status: 400 }
      );
    }

    const result = await updateSurveyStakeholder(
      { assignmentId, stakeholderTaskId, stakeholderId },
      auth.user
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Update survey stakeholder error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update survey stakeholder" },
      { status: error.statusCode || 500 }
    );
  }
}

