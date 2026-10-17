import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getIssuesList } from "@/services/dataQualityService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const surveyRoundId = searchParams.get("surveyRoundId") || "";
    const category = searchParams.get("category") || "";
    const severity = searchParams.get("severity") || "";
    const issueType = searchParams.get("issueType") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;

    const data = await getIssuesList({
      projectId,
      surveyRoundId,
      category,
      severity,
      issueType,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (error) {
    console.error("Get data quality issues error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load issues" },
      { status: error.statusCode || 500 }
    );
  }
}
