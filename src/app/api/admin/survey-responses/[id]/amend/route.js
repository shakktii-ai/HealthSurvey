import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { amendSurveyResponse } from "@/services/dataQualityService";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { answers = {}, reason = "" } = body;

    const result = await amendSurveyResponse(
      { responseId: id, answers, reason },
      auth.user
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Amend survey response error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to amend survey response",
        missingQuestionCode: error.missingQuestionCode || null,
      },
      { status: error.statusCode || 500 }
    );
  }
}
