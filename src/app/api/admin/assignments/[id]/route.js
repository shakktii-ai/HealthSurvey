import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getAssignmentById,
  updateAssignmentDueDate,
} from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const assignment = await getAssignmentById(id, auth.user);
    return NextResponse.json(
      { success: true, item: assignment },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get assignment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch assignment" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(request, { params }) {
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
    const updated = await updateAssignmentDueDate(id, body, auth.user);
    return NextResponse.json(
      { success: true, item: updated, message: updated.message },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update assignment" },
      { status: error.statusCode || 400 }
    );
  }
}
