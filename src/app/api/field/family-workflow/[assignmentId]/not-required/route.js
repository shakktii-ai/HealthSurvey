import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { markTaskNotRequired } from "@/services/familyWorkflowService";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const auth = await requireAuth(["field_worker", "superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Field worker permissions required" },
        { status: 403 }
      );
    }

    const { assignmentId } = await params;
    const body = await req.json();
    const { taskKey, reason } = body || {};

    if (!taskKey) {
      return NextResponse.json(
        { success: false, error: "taskKey is required (e.g. asha, facility_staff, govt_official, light_touch)" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "A valid explanation reason (at least 5 characters) is required." },
        { status: 400 }
      );
    }

    const updatedWorkflow = await markTaskNotRequired({
      assignmentId,
      taskKey,
      reason,
      user: auth.user,
    });

    return NextResponse.json({
      success: true,
      message: `Task '${taskKey}' successfully marked as Not Required with audit trail.`,
      workflow: updatedWorkflow,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to mark task as not required" },
      { status: err.statusCode || 500 }
    );
  }
}
