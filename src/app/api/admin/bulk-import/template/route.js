import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateTemplateWorkbook } from "@/services/bulkImportService";

/**
 * GET /api/admin/bulk-import/template
 * Downloads the simplified master data Excel template with exactly ONE worksheet.
 * Filename: healthsurvey-master-data-demo.xlsx
 */
export async function GET() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const buffer = await generateTemplateWorkbook();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="healthsurvey-master-data-demo.xlsx"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Bulk import template generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate master data template" },
      { status: 500 }
    );
  }
}
