import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import DataQualityScan from "@/models/DataQualityScan";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid scan ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const scan = await DataQualityScan.findById(id)
      .populate("project", "name code")
      .populate("surveyRound", "name code")
      .populate("initiatedBy", "name email");

    if (!scan) {
      return NextResponse.json(
        { success: false, error: "Scan record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item: scan.toSafeObject() }, { status: 200 });
  } catch (error) {
    console.error("Get scan details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch scan details" },
      { status: error.statusCode || 500 }
    );
  }
}
