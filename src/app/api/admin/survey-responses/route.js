import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import SurveyResponse from "@/models/SurveyResponse";
import Family from "@/models/Family";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";
    const surveyRoundId = searchParams.get("surveyRoundId") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit"), 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      query.project = new mongoose.Types.ObjectId(projectId);
    }
    if (surveyRoundId && mongoose.Types.ObjectId.isValid(surveyRoundId)) {
      query.surveyRound = new mongoose.Types.ObjectId(surveyRoundId);
    }
    if (category) query.category = category;
    if (status) query.status = status;

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) dateRange.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      query.submittedAt = dateRange;
    }

    if (search && search.trim()) {
      const term = search.trim();
      // Look up families with matching familyCode or householdHeadName
      const matchingFamilies = await Family.find({
        $or: [
          { familyCode: { $regex: term, $options: "i" } },
          { householdHeadName: { $regex: term, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const matchingFamilyIds = matchingFamilies.map((f) => f._id);

      query.$or = [
        { responseCode: { $regex: term, $options: "i" } },
        { respondentName: { $regex: term, $options: "i" } },
        { family: { $in: matchingFamilyIds } },
      ];
    }

    const [responses, total] = await Promise.all([
      SurveyResponse.find(query)
        .populate("project", "name code")
        .populate("surveyRound", "name code")
        .populate("fieldWorker", "name email phone")
        .populate("family", "familyCode householdHeadName")
        .populate("stakeholder", "fullName stakeholderType")
        .populate("assignment", "assignmentCode status")
        .populate("stakeholderTask", "taskCode status")
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SurveyResponse.countDocuments(query),
    ]);

    // Mask PII by default
    const safeResponses = responses.map((r) => {
      const copy = { ...r, id: r._id.toString() };
      if (copy.respondentName) {
        copy.respondentName = copy.respondentName.charAt(0) + "*** (Masked)";
      }
      if (copy.family?.householdHeadName) {
        copy.family.householdHeadName = copy.family.householdHeadName.charAt(0) + "*** (Masked)";
      }
      if (copy.fieldWorker?.phone) {
        copy.fieldWorker.phone = copy.fieldWorker.phone.slice(0, 4) + "******" + copy.fieldWorker.phone.slice(-2);
      }
      return copy;
    });

    return NextResponse.json(
      {
        success: true,
        items: safeResponses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get admin survey responses error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load responses" },
      { status: error.statusCode || 500 }
    );
  }
}
