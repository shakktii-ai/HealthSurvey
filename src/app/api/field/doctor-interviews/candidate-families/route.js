import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Family from "@/models/Family";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const facilityId = searchParams.get("facilityId") || "";
    const search = searchParams.get("search") || "";

    const query = { status: "active" };
    if (projectId) query.project = projectId;
    if (facilityId) query.facility = facilityId;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ familyCode: regex }, { householdHeadName: regex }];
    }

    const families = await Family.find(query)
      .select("familyCode householdHeadName phoneNumber village")
      .populate("village", "name code")
      .limit(100)
      .lean();

    const items = families.map((f) => ({
      id: f._id.toString(),
      familyCode: f.familyCode,
      householdHeadName: f.householdHeadName,
      phoneNumber: f.phoneNumber,
      village: f.village ? { id: f.village._id.toString(), name: f.village.name } : null,
    }));

    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    console.error("Field candidate families error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load candidate families" },
      { status: 500 }
    );
  }
}
