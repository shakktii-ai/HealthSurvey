import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { acknowledgeIssue } from "@/services/dataQualityService";

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
    const updated = await acknowledgeIssue(id, auth.user);
    return NextResponse.json(
      { success: true, message: "Issue successfully acknowledged", item: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Acknowledge issue error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to acknowledge issue" },
      { status: error.statusCode || 500 }
    );
  }
}
