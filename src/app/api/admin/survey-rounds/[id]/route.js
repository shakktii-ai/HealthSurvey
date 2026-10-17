import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSurveyRoundById, updateSurveyRound } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const item = await getSurveyRoundById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Survey round not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (error) {
    console.error("Get survey round error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve survey round" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const item = await updateSurveyRound(id, body, auth.user);

    return NextResponse.json(
      { success: true, message: "Survey round updated successfully", item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update survey round error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update survey round" },
      { status: 400 }
    );
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}
