import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDoctorInterviewsForFamily } from "@/services/doctorInterviewService";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const auth = await requireAuth(["superadmin", "field_worker", "donor"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const interviews = await getDoctorInterviewsForFamily(id);
    return NextResponse.json({ success: true, items: interviews, data: interviews }, { status: 200 });
  } catch (error) {
    console.error("Get family doctor interviews error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch doctor interviews for family" },
      { status: 500 }
    );
  }
}
