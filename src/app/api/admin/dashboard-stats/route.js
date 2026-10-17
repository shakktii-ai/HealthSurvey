import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDashboardMetrics } from "@/services/dashboardService";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const data = await getDashboardMetrics();
    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
