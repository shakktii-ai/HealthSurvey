import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listQuestions, createQuestion } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const category = searchParams.get("category") || "";
    const roundId = searchParams.get("roundId") || "";
    const status = searchParams.get("status") || "";
    const answerType = searchParams.get("answerType") || "";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";

    const result = await listQuestions({
      projectId,
      category,
      roundId,
      status,
      answerType,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List questions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list questions" },
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
    const item = await createQuestion(body, auth.user);
    return NextResponse.json(
      { success: true, message: "Question created successfully", item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create question" },
      { status: 400 }
    );
  }
}
