import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listAllGrants, grantDonorProjectAccess } from "@/services/donorAccessService";
import User from "@/models/User";
import Project from "@/models/Project";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/donor-access
 * Superadmin lists all donor project access grants, available donors, and active projects.
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(["superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const donorId = searchParams.get("donorId") || "";
    const projectId = searchParams.get("projectId") || "";
    const status = searchParams.get("status") || "";

    const grants = await listAllGrants({ donorId, projectId, status });

    // Fetch list of donor users for selection
    const donors = await User.find({ role: "donor" })
      .select("name email status")
      .sort({ name: 1 });

    // Fetch list of active projects for selection
    const projects = await Project.find({ status: "active" })
      .select("name code status")
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: {
        grants,
        donors: donors.map((d) => d.toSafeObject ? d.toSafeObject() : { id: d._id.toString(), name: d.name, email: d.email, status: d.status }),
        projects: projects.map((p) => p.toSafeObject ? p.toSafeObject() : { id: p._id.toString(), name: p.name, code: p.code, status: p.status }),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/donor-access error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/donor-access
 * Superadmin grants explicit project access to a Donor account.
 */
export async function POST(request) {
  try {
    const auth = await requireAuth(["superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { donorId, projectId, notes } = body;

    if (!donorId || !projectId) {
      return NextResponse.json(
        { success: false, error: "Both donorId and projectId are required" },
        { status: 400 }
      );
    }

    const grant = await grantDonorProjectAccess({
      donorId,
      projectId,
      grantedBy: auth.user,
      notes,
    });

    return NextResponse.json(
      { success: true, message: "Project access granted to donor successfully", data: grant },
      { status: 201 }
    );
  } catch (error) {
    const status = error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
