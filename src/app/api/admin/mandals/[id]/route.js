import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMandalById, updateMandal, toggleMandalStatus } from "@/services/masterDataService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const mandal = await getMandalById(id);
    if (!mandal) {
      return NextResponse.json({ success: false, error: "Mandal not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: mandal }, { status: 200 });
  } catch (error) {
    console.error("Get mandal error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch mandal" }, { status: 500 });
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
    const result = await updateMandal(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: "Mandal updated successfully", item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Update mandal error:", error);
    return NextResponse.json({ success: false, error: "Failed to update mandal" }, { status: 500 });
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

    const result = await toggleMandalStatus(id, status, auth.user);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: `Mandal status set to ${status}`, item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Toggle mandal status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update mandal status" }, { status: 500 });
  }
}
