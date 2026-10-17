import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getProjectById, updateProject, toggleProjectStatus } from "@/services/masterDataService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: project }, { status: 200 });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await updateProject(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: "Project updated successfully", item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ success: false, error: "Failed to update project" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const result = await toggleProjectStatus(id, status, auth.user);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: `Project status set to ${status}`, item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Toggle project status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update project status" }, { status: 500 });
  }
}
