import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getIssueDetails } from "@/services/dataQualityService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const issue = await getIssueDetails(id);
    return NextResponse.json({ success: true, item: issue }, { status: 200 });
  } catch (error) {
    console.error("Get issue details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load issue details" },
      { status: error.statusCode || 500 }
    );
  }
}
