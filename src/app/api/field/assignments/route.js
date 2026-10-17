import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listFieldWorkerAssignments } from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Allow field workers and superadmin previewing
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";

    // Strictly derive worker ID from authenticated session user
    const workerId = auth.user.id;

    const result = await listFieldWorkerAssignments(workerId, {
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Field worker list assignments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load field assignments" },
      { status: error.statusCode || 500 }
    );
  }
}
