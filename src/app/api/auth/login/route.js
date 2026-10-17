import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateUser } from "@/services/authService";
import { COOKIE_NAME, getCookieOptions } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await authenticateUser({ email, password });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 401 }
      );
    }

    // Role-based target redirects
    const roleRedirects = {
      superadmin: "/admin/dashboard",
      field_worker: "/field/dashboard",
      donor: "/donor/dashboard",
    };

    const redirectTo = roleRedirects[result.user.role] || "/";

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, result.token, getCookieOptions());

    return NextResponse.json(
      {
        success: true,
        user: result.user,
        redirectTo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
