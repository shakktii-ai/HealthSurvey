import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseExcelBuffer, validateBulkImportRows } from "@/services/bulkImportService";

/**
 * POST /api/admin/bulk-import/validate
 * Accepts an uploaded Excel file or JSON payload and validates the complete single worksheet.
 * Enforces Superadmin authorization.
 */
export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No Excel file provided in request." },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      if (body.base64) {
        buffer = Buffer.from(body.base64, "base64");
      } else if (Array.isArray(body.rows)) {
        // Direct row validation
        const validation = await validateBulkImportRows(body.rows);
        return NextResponse.json({
          success: true,
          sheetName: "Master Data",
          totalSheets: 1,
          ...validation,
        });
      } else {
        return NextResponse.json(
          { success: false, error: "Please provide an Excel file or base64 file data." },
          { status: 400 }
        );
      }
    } else {
      // Raw binary stream
      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { success: false, error: "No file content received." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer) {
      return NextResponse.json(
        { success: false, error: "Failed to read file buffer." },
        { status: 400 }
      );
    }

    // Parse the single worksheet
    const { sheetName, totalSheets, rows } = parseExcelBuffer(buffer);

    // Validate the rows
    const validation = await validateBulkImportRows(rows);

    return NextResponse.json({
      success: true,
      sheetName,
      totalSheets,
      ...validation,
    });
  } catch (error) {
    console.error("Bulk import validation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate master data file." },
      { status: 500 }
    );
  }
}
