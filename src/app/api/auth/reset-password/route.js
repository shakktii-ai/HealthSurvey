import { NextResponse } from "next/server";
import {
  generatePasswordResetToken,
  resetPasswordWithToken,
} from "@/services/authService";

/**
 * Password Reset Foundation Endpoint.
 * - POST: Requests password reset token for an email (anti-enumeration protected).
 * - PUT: Consumes the reset token to apply a new password.
 */

export async function POST(request) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const result = await generatePasswordResetToken(email);

    return NextResponse.json(
      {
        success: true,
        message:
          "If the account exists, password reset instructions have been generated.",
        // Only return token in development mode for test verification
        ...(process.env.NODE_ENV !== "production" && result.token
          ? { devResetToken: result.token }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process password reset" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { token, newPassword } = await request.json().catch(() => ({}));

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Token and new password are required" },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken({ token, newPassword });

    return NextResponse.json(
      { success: result.success, message: result.message || result.error },
      { status: result.status }
    );
  } catch (error) {
    console.error("Password reset update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
