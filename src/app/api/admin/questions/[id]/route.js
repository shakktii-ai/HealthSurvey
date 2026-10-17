import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getQuestionById, updateQuestion, archiveQuestion } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const item = await getQuestionById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (error) {
    console.error("Get question error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve question" },
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
    const item = await updateQuestion(id, body, auth.user);

    return NextResponse.json(
      { success: true, message: "Question updated successfully", item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update question" },
      { status: 400 }
    );
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const item = await archiveQuestion(id, auth.user);

    return NextResponse.json(
      { success: true, message: "Question archived successfully", item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Archive question error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive question" },
      { status: 400 }
    );
  }
}
