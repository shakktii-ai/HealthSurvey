import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFacilityById, updateFacility, toggleFacilityStatus } from "@/services/masterDataService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const facility = await getFacilityById(id);
    if (!facility) {
      return NextResponse.json({ success: false, error: "Facility not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: facility }, { status: 200 });
  } catch (error) {
    console.error("Get facility error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch facility" }, { status: 500 });
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
    const result = await updateFacility(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: "Facility updated successfully", item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Update facility error:", error);
    return NextResponse.json({ success: false, error: "Failed to update facility" }, { status: 500 });
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

    const result = await toggleFacilityStatus(id, status, auth.user);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: `Facility status set to ${status}`, item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Toggle facility status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update facility status" }, { status: 500 });
  }
}
