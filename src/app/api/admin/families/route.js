import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listFamilies, createFamily } from "@/services/familyService";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const mandalId = searchParams.get("mandalId") || "";
    const facilityId = searchParams.get("facilityId") || "";
    const villageId = searchParams.get("villageId") || "";
    const ashaId = searchParams.get("ashaId") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const shortlisted = searchParams.get("shortlisted") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const result = await listFamilies({
      projectId,
      mandalId,
      facilityId,
      villageId,
      ashaId,
      doctorId,
      shortlisted,
      status,
      search,
      page,
      limit,
      isSuperadmin: true,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("List families error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve families" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await createFamily(body, auth.user);

    if (!result.success) {
      if (result.potentialDuplicate) {
        return NextResponse.json(
          {
            success: false,
            potentialDuplicate: true,
            matches: result.matches,
            error: result.error,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Family registered successfully",
        item: result.item,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create family error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to register family" }, { status: 500 });
  }
}
