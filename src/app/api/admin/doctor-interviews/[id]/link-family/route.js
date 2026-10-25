import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  linkFamiliesToDoctorInterview,
  unlinkFamilyFromDoctorInterview,
} from "@/services/doctorInterviewService";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const familyIds = body.familyIds || (body.familyId ? [body.familyId] : []);

    const result = await linkFamiliesToDoctorInterview(id, familyIds, auth.user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message, item: result.item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Link family to doctor interview error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to link family to doctor interview" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const familyId = searchParams.get("familyId") || body.familyId;

    if (!familyId) {
      return NextResponse.json(
        { success: false, error: "familyId is required to unlink" },
        { status: 400 }
      );
    }

    const result = await unlinkFamilyFromDoctorInterview(id, familyId, auth.user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message, item: result.item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unlink family from doctor interview error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to unlink family from doctor interview" },
      { status: 500 }
    );
  }
}
