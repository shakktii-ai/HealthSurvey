import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getVillageById, updateVillage, toggleVillageStatus } from "@/services/masterDataService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const village = await getVillageById(id);
    if (!village) {
      return NextResponse.json({ success: false, error: "Village not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: village }, { status: 200 });
  } catch (error) {
    console.error("Get village error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch village" }, { status: 500 });
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
    const result = await updateVillage(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: "Village updated successfully", item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Update village error:", error);
    return NextResponse.json({ success: false, error: "Failed to update village" }, { status: 500 });
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

    const result = await toggleVillageStatus(id, status, auth.user);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: `Village status set to ${status}`, item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Toggle village status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update village status" }, { status: 500 });
  }
}
