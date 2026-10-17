import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getQuestionVersions } from "@/services/questionnaireService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const versions = await getQuestionVersions(id);
    return NextResponse.json({ success: true, items: versions }, { status: 200 });
  } catch (error) {
    console.error("Get question versions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve question versions" },
      { status: 500 }
    );
  }
}
