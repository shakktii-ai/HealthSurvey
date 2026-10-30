import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStakeholderById, updateStakeholder, toggleStakeholderStatus } from "@/services/masterDataService";
import { permanentlyDeleteStakeholder } from "@/services/stakeholderDeletionService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const stakeholder = await getStakeholderById(id);
    if (!stakeholder) {
      return NextResponse.json({ success: false, error: "Stakeholder not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: stakeholder }, { status: 200 });
  } catch (error) {
    console.error("Get stakeholder error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch stakeholder" }, { status: 500 });
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
    const result = await updateStakeholder(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: "Stakeholder updated successfully", item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Update stakeholder error:", error);
    return NextResponse.json({ success: false, error: "Failed to update stakeholder" }, { status: 500 });
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

    const result = await toggleStakeholderStatus(id, status, auth.user);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, message: `Stakeholder status set to ${status}`, item: result.item }, { status: 200 });
  } catch (error) {
    console.error("Toggle stakeholder status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update stakeholder status" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  // Only Superadmin is authorized to permanently delete stakeholders
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || "Access denied. Superadmin privileges required." },
      { status: auth.status || 403 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason = "", confirmation = "" } = body;

    // Validate confirmation string
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: "Permanent deletion requires typing 'DELETE' in the confirmation field.",
        },
        { status: 400 }
      );
    }

    const result = await permanentlyDeleteStakeholder(
      id,
      { reason, confirmation },
      auth.user
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Delete stakeholder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to permanently delete stakeholder" },
      { status: 500 }
    );
  }
}
