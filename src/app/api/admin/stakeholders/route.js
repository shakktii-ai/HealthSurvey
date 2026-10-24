import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listStakeholders, createStakeholder } from "@/services/masterDataService";

export async function GET(request) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const mandalId = searchParams.get("mandalId") || "";
    const facilityId = searchParams.get("facilityId") || "";
    const villageId = searchParams.get("villageId") || "";
    const stakeholderType = searchParams.get("stakeholderType") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const result = await listStakeholders({ projectId, mandalId, facilityId, villageId, stakeholderType, search, status, page, limit });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List stakeholders error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve stakeholders" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin", "field_worker"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await createStakeholder(body, auth.user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, item: result.item || null },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Stakeholder created successfully", item: result.item }, { status: 201 });
  } catch (error) {
    console.error("Create stakeholder error:", error);
    return NextResponse.json({ success: false, error: "Failed to create stakeholder" }, { status: 500 });
  }
}
