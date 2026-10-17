import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listAdminAssignments,
  createFamilyAssignment,
} from "@/services/assignmentService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const surveyRoundId = searchParams.get("surveyRoundId") || "";
    const fieldWorkerId = searchParams.get("fieldWorkerId") || "";
    const assignmentType = searchParams.get("assignmentType") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";

    const result = await listAdminAssignments({
      projectId,
      surveyRoundId,
      fieldWorkerId,
      assignmentType,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List assignments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list assignments" },
      { status: error.statusCode || 500 }
    );
  }
}

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
    const assignment = await createFamilyAssignment(body, auth.user);
    return NextResponse.json(
      {
        success: true,
        message: "Family assignment created successfully",
        item: assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create assignment",
        existingAssignment: error.existingAssignment || null,
      },
      { status: error.statusCode || 400 }
    );
  }
}
