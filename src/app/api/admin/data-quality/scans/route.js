import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runDataQualityScan, getScanHistory } from "@/services/dataQualityService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { projectId = "", surveyRoundId = "", category = "" } = body;

    const result = await runDataQualityScan(
      { projectId, surveyRoundId, category },
      auth.user
    );

    return NextResponse.json(
      { success: true, message: "Data quality scan completed successfully", scan: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Data quality scan trigger error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute data quality scan",
        partialResult: error.partialResult || null,
      },
      { status: error.statusCode || 500 }
    );
  }
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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const surveyRoundId = searchParams.get("surveyRoundId") || "";
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 10;

    const history = await getScanHistory({
      projectId,
      surveyRoundId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...history }, { status: 200 });
  } catch (error) {
    console.error("Data quality scan history error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load scan history" },
      { status: error.statusCode || 500 }
    );
  }
}
