import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDoctorInterviewById, updateDoctorInterview } from "@/services/doctorInterviewService";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const interview = await getDoctorInterviewById(id);
    if (!interview) {
      return NextResponse.json(
        { success: false, error: "Doctor interview not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item: interview }, { status: 200 });
  } catch (error) {
    console.error("Get doctor interview error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch doctor interview" },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await updateDoctorInterview(id, body, auth.user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Doctor interview updated successfully", item: result.item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update doctor interview error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update doctor interview" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}
