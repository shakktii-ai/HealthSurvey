import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveSurveyDraft } from "@/services/surveyExecutionService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await saveSurveyDraft(body, auth.user);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Save survey draft error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save draft" },
      { status: error.statusCode || 400 }
    );
  }
}
