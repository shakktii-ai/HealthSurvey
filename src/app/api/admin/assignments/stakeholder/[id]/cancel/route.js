import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cancelStakeholderTask } from "@/services/assignmentService";

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
    const cancelled = await cancelStakeholderTask(id, body, auth.user);
    return NextResponse.json(
      { success: true, item: cancelled, message: cancelled.message },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cancel stakeholder task error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel stakeholder task" },
      { status: error.statusCode || 400 }
    );
  }
}
