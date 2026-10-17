import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFamilyById, updateFamily, toggleFamilyStatus } from "@/services/familyService";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const family = await getFamilyById(id, { isSuperadmin: true });
    if (!family) {
      return NextResponse.json({ success: false, error: "Family record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: family }, { status: 200 });
  } catch (error) {
    console.error("Get family error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch family record" }, { status: 500 });
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
    const result = await updateFamily(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }
    return NextResponse.json(
      { success: true, message: "Family record updated successfully", item: result.item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update family error:", error);
    return NextResponse.json({ success: false, error: "Failed to update family record" }, { status: 500 });
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
    const { status, shortlisted } = body;

    if (status !== undefined) {
      const result = await toggleFamilyStatus(id, status, auth.user);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json(
        { success: true, message: `Family status set to ${status}`, item: result.item },
        { status: 200 }
      );
    }

    if (shortlisted !== undefined) {
      const result = await updateFamily(id, { shortlisted: Boolean(shortlisted) }, auth.user);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json(
        {
          success: true,
          message: `Family ${shortlisted ? "shortlisted" : "removed from shortlist"}`,
          item: result.item,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, error: "No valid action provided in PATCH body" }, { status: 400 });
  } catch (error) {
    console.error("Patch family error:", error);
    return NextResponse.json({ success: false, error: "Failed to modify family record" }, { status: 500 });
  }
}
