import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSurveyResponseDetails } from "@/services/surveyExecutionService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["field_worker", "superadmin", "donor"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const response = await getSurveyResponseDetails(id, auth.user);
    return NextResponse.json({ success: true, item: response }, { status: 200 });
  } catch (error) {
    console.error("Get survey response error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch response" },
      { status: error.statusCode || 500 }
    );
  }
}
