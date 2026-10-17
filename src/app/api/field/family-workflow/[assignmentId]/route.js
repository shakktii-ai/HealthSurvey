import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFamilyWorkflow } from "@/services/familyWorkflowService";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
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
    const workflow = await getFamilyWorkflow(assignmentId, auth.user);

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve family workflow" },
      { status: err.statusCode || 500 }
    );
  }
}
