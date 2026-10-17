import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMonitoringMetrics } from "@/services/surveyMonitoringService";

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
    const fieldWorkerId = searchParams.get("fieldWorkerId") || "";
    const assignmentStatus = searchParams.get("assignmentStatus") || "";
    const responseStatus = searchParams.get("responseStatus") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const metrics = await getMonitoringMetrics({
      projectId,
      surveyRoundId,
      category,
      fieldWorkerId,
      assignmentStatus,
      responseStatus,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, ...metrics }, { status: 200 });
  } catch (error) {
    console.error("Survey monitoring error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load monitoring metrics" },
      { status: error.statusCode || 500 }
    );
  }
}
