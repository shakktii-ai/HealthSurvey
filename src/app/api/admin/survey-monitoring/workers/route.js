import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFieldWorkerProgress } from "@/services/surveyMonitoringService";

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

    const workers = await getFieldWorkerProgress({
      projectId,
      surveyRoundId,
    });

    return NextResponse.json({ success: true, items: workers }, { status: 200 });
  } catch (error) {
    console.error("Survey monitoring workers error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load worker progress" },
      { status: error.statusCode || 500 }
    );
  }
}
