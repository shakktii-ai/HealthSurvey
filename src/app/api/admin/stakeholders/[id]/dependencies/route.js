import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { analyzeStakeholderDependencies } from "@/services/stakeholderDeletionService";

export async function GET(request, context) {
  // Only Superadmin is permitted to analyze deletion dependencies
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || "Access denied. Superadmin privileges required." },
      { status: auth.status || 403 }
    );
  }

  try {
    const { id } = await context.params;
    const result = await analyzeStakeholderDependencies(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Stakeholder dependency analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate stakeholder dependencies" },
      { status: 500 }
    );
  }
}

