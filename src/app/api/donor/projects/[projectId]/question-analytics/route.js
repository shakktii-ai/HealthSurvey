import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getQuestionAnalytics } from "@/services/donorAnalyticsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/donor/projects/[projectId]/question-analytics
 * Generates question-level aggregate statistics with server-side small group suppression.
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
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get("roundId") || undefined;
    const category = searchParams.get("category") || undefined;

    const data = await getQuestionAnalytics(auth.user, projectId, { roundId, category });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
