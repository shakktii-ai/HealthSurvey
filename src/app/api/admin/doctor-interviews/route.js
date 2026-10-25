import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listDoctorInterviews, createDoctorInterview } from "@/services/doctorInterviewService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const facilityId = searchParams.get("facilityId") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const result = await listDoctorInterviews({
      projectId,
      facilityId,
      doctorId,
      status,
      search,
      page,
      limit,
      actor: auth.user,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List doctor interviews error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve doctor interviews" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await createDoctorInterview(body, auth.user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Doctor interview created successfully", item: result.item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create doctor interview error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create doctor interview" },
      { status: 500 }
    );
  }
}
