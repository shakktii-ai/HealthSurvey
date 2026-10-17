import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getExecutionSurveyData } from "@/services/surveyExecutionService";

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
