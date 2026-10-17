import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAssignmentById } from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    // getAssignmentById enforces ownership if user.role === "field_worker"
    const assignment = await getAssignmentById(id, auth.user);
    return NextResponse.json(
      { success: true, item: assignment },
      { status: 200 }
    );
  } catch (error) {
    console.error("Field worker get assignment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch assignment" },
      { status: error.statusCode || 500 }
    );
  }
}
