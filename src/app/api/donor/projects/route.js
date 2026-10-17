import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDonorProjectsList } from "@/services/donorAnalyticsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/donor/projects
 * Lists all projects authorized for the authenticated donor.
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
        projects,
        total: projects.length,
      },
    });
  } catch (error) {
    console.error("GET /api/donor/projects error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
