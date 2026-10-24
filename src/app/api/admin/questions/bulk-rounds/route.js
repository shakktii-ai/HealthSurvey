import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { bulkUpdateQuestionRounds } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await bulkUpdateQuestionRounds(body, auth.user);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Bulk update question rounds error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to bulk update survey rounds on questions" },
      { status: 400 }
    );
  }
}
