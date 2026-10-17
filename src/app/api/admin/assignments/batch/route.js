import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createVillageBatchAssignments } from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const summary = await createVillageBatchAssignments(body, auth.user);
    return NextResponse.json(
      {
        success: true,
        message: `Created ${summary.createdCount} village batch assignments`,
        summary,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Batch assignment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create village batch assignments",
      },
      { status: error.statusCode || 400 }
    );
  }
}
