import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/Project";
import Facility from "@/models/Facility";
import Mandal from "@/models/Mandal";
import Stakeholder from "@/models/Stakeholder";
import SurveyRound from "@/models/SurveyRound";
import Question from "@/models/Question";

import Village from "@/models/Village";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAuth(["field_worker", "superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectToDatabase();

    const [projects, facilities, mandals, villages, doctors, rounds, questions] = await Promise.all([
      Project.find({ status: "active" }).select("name code").sort({ name: 1 }).lean(),
      Facility.find({ status: "active" })
        .select("name code projectId mandalId facilityType serviceCategory")
        .sort({ name: 1 })
        .lean(),
      Mandal.find({ status: "active" })
        .select("name code projectId")
        .sort({ name: 1 })
        .lean(),
      Village.find({ status: "active" })
        .select("name code projectId mandalId facilityId")
        .sort({ name: 1 })
        .lean(),
      Stakeholder.find({
        status: "active",
        $or: [
          { stakeholderType: "doctor" },
          { stakeholderType: "facility_staff" },
        ],
      })
        .select("fullName designation phone stakeholderType projectId mandalId facilityId villageId")
        .sort({ fullName: 1 })
        .lean(),
      SurveyRound.find({ status: "active" }).select("name code roundType").sort({ name: 1 }).lean(),
      Question.find({ category: "doctor", status: "active" })
        .select("code text order answerType options")
        .sort({ order: 1 })
        .lean(),
    ]);

    const formatDoc = (d) => {
      const pId = (d.projectId?._id || d.projectId || d.project?._id || d.project)?.toString() || null;
      const mId = (d.mandalId?._id || d.mandalId || d.mandal?._id || d.mandal)?.toString() || null;
      const fId = (d.facilityId?._id || d.facilityId || d.facility?._id || d.facility)?.toString() || null;
      const vId = (d.villageId?._id || d.villageId || d.village?._id || d.village)?.toString() || null;
      return {
        ...d,
        id: d._id.toString(),
        _id: d._id.toString(),
        projectId: pId,
        project: pId,
        mandalId: mId,
        mandal: mId,
        facilityId: fId,
        facility: fId,
        villageId: vId,
        village: vId,
      };
    };

    return NextResponse.json(
      {
        success: true,
        projects: projects.map(formatDoc),
        facilities: facilities.map(formatDoc),
        mandals: mandals.map(formatDoc),
        villages: villages.map(formatDoc),
        doctors: doctors.map(formatDoc),
        surveyRounds: rounds.map(formatDoc),
        questions: questions.map((q) => ({
          ...formatDoc(q),
          text: typeof q.text === "object" ? q.text?.en || q.text?.te || "" : q.text || "",
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Field doctor interview metadata error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load doctor interview metadata" },
      { status: 500 }
    );
  }
}
