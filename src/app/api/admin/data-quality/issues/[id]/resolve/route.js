import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveIssue } from "@/services/dataQualityService";

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
    const { reason = "" } = body;

    const updated = await resolveIssue(id, { reason }, auth.user);
    return NextResponse.json(
      { success: true, message: "Issue successfully resolved", item: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resolve issue error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve issue" },
      { status: error.statusCode || 500 }
    );
  }
}
