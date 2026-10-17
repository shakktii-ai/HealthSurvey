import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateErrorReportWorkbook } from "@/services/bulkImportService";

/**
 * POST /api/admin/bulk-import/export-errors
 * Generates and downloads an Excel error report containing original row numbers,
 * entity types, and failure reasons.
 */
export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const errors = body.errors || [];

    const buffer = await generateErrorReportWorkbook(errors);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="healthsurvey-import-errors.xlsx"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Export errors error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate error report" },
      { status: 500 }
    );
  }
}
