import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listFacilities, createFacility } from "@/services/masterDataService";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const mandalId = searchParams.get("mandalId") || "";
    const serviceCategory = searchParams.get("serviceCategory") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const result = await listFacilities({ projectId, mandalId, serviceCategory, search, status, page, limit });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List facilities error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve facilities" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await createFacility(body, auth.user);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: "Facility created successfully", item: result.item }, { status: 201 });
  } catch (error) {
    console.error("Create facility error:", error);
    return NextResponse.json({ success: false, error: "Failed to create facility" }, { status: 500 });
  }
}
