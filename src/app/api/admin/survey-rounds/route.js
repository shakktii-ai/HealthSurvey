import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSurveyRounds, createSurveyRound } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const items = await listSurveyRounds({ projectId, status, search });
    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    console.error("List survey rounds error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list survey rounds" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const item = await createSurveyRound(body, auth.user);
    return NextResponse.json(
      { success: true, message: "Survey round created successfully", item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create survey round error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create survey round" },
      { status: 400 }
    );
  }
}
