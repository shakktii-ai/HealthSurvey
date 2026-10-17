import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { revokeDonorProjectAccess } from "@/services/donorAccessService";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/donor-access/[id]
 * Superadmin revokes a donor project grant.
 */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(["superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Grant ID is required" }, { status: 400 });
    }

    const revoked = await revokeDonorProjectAccess({
      grantId: id,
      revokedBy: auth.user,
    });

    return NextResponse.json({
      success: true,
      message: "Donor project access revoked successfully",
      data: revoked,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
