import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executeBulkImport } from "@/services/bulkImportService";

/**
 * POST /api/admin/bulk-import/execute
 * Executes the bulk import for validated rows after explicit user confirmation.
 * Enforces Superadmin authorization.
 */
export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const previewRows = body.previewRows || body.rows;

    if (!Array.isArray(previewRows) || previewRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No preview rows provided for import." },
        { status: 400 }
      );
    }

    const report = await executeBulkImport({ previewRows }, auth.user);

    return NextResponse.json({
      success: true,
      message: `Bulk import completed. Successfully imported ${report.successfullyImported} records.`,
      report,
    });
  } catch (error) {
    console.error("Bulk import execution error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute bulk import." },
      { status: 500 }
    );
  }
}
