import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { previewVillageBatch } from "@/services/assignmentService";

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
    const villageId = searchParams.get("villageId") || "";

    if (!projectId || !surveyRoundId || !villageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: projectId, surveyRoundId, and villageId are required",
        },
        { status: 400 }
      );
    }

    const preview = await previewVillageBatch({
      projectId,
      surveyRoundId,
      villageId,
    });

    return NextResponse.json({ success: true, preview }, { status: 200 });
  } catch (error) {
    console.error("Preview village batch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to preview village batch",
      },
      { status: error.statusCode || 400 }
    );
  }
}
