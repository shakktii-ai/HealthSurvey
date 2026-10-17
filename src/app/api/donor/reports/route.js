import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDonorProjectsList } from "@/services/donorAnalyticsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/donor/reports
 * Lists report availability and download scopes for authorized donor projects.
 */
export async function GET() {
  try {
    const auth = await requireAuth(["donor", "superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const projects = await getDonorProjectsList(auth.user);

    return NextResponse.json({
      success: true,
      data: {
        availableReports: projects.map((p) => ({
          projectId: p.id,
          projectName: p.name,
          projectCode: p.code,
          surveyRounds: p.surveyRounds,
          metrics: p.metrics,
          exportUrl: `/api/donor/reports/export?projectId=${p.id}`,
        })),
        privacyNotice: "All reports apply server-side small group suppression (N < 5) and strictly redact household personally identifiable information (PII).",
      },
    });
  } catch (error) {
    console.error("GET /api/donor/reports error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
