import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRoundComparison } from "@/services/donorAnalyticsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/donor/projects/[projectId]/round-comparison
 * Provides side-by-side comparison across survey rounds (Baseline, Midline, Endline).
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireAuth(["donor", "superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { projectId } = await params;
    const data = await getRoundComparison(auth.user, projectId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
