import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrCreateLinkedStakeholderTask } from "@/services/familyWorkflowService";

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
    const { taskKey, stakeholderId } = body || {};

    if (!taskKey) {
      return NextResponse.json(
        { success: false, error: "taskKey is required (asha, facility_staff, govt_official, light_touch)" },
        { status: 400 }
      );
    }

    const result = await getOrCreateLinkedStakeholderTask({
      assignmentId,
      taskKey,
      stakeholderId,
      user: auth.user,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to link stakeholder task" },
      { status: err.statusCode || 500 }
    );
  }
}
