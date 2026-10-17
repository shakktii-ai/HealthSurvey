import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFamilyWorkflowList } from "@/services/familyWorkflowService";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const auth = await requireAuth(["field_worker", "superadmin"]);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Field worker permissions required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "15";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const roundId = searchParams.get("roundId") || "";

    const result = await getFamilyWorkflowList(auth.user, {
      page,
      limit,
      status,
      search,
      roundId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: err.statusCode || 500 }
    );
  }
}
