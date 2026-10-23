import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Immediately expire cookie
    });

    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during logout" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (error) {
    console.error("Error clearing cookie on GET logout:", error);
  }

  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl");
  const loginUrl = new URL("/login", request.url);
  if (callbackUrl) {
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
  }
  return NextResponse.redirect(loginUrl);
}

