import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { startAssignment } from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    // startAssignment ensures worker owns the assignment and updates status idempotently
    const started = await startAssignment(id, auth.user);
    return NextResponse.json(
      { success: true, item: started, message: started.message },
      { status: 200 }
    );
  } catch (error) {
    console.error("Start assignment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start assignment" },
      { status: error.statusCode || 400 }
    );
  }
}
