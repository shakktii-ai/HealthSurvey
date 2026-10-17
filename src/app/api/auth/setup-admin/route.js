import { NextResponse } from "next/server";
import { createInitialSuperadmin } from "@/services/authService";

/**
 * One-time setup endpoint for the initial Superadmin.
 * Automatically locks once a Superadmin exists in the database.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Read from request body or fallback to server environment variables
    const name = body.name || process.env.SUPERADMIN_NAME || "System Superadmin";
    const email = body.email || process.env.SUPERADMIN_EMAIL;
    const password = body.password || process.env.SUPERADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Superadmin credentials missing. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in environment or provide in setup payload.",
        },
        { status: 400 }
      );
    }

    const result = await createInitialSuperadmin({ name, email, password });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Initial Superadmin created successfully. Setup is now permanently locked.",
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Superadmin initialization error:", error);
    return NextResponse.json(
      { success: false, error: "Setup failed" },
      { status: 500 }
    );
  }
}
