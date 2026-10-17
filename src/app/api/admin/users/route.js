import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listUsers,
  createUser,
  toggleUserStatus,
} from "@/services/userService";

/**
 * Superadmin-only User Management Endpoints.
 * Enforces role-based access control independently on the server.
 */

export async function GET() {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role, status } = body;

    const result = await createUser({
      name,
      email,
      password,
      role,
      status,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: "userId and status are required" },
        { status: 400 }
      );
    }

    const result = await toggleUserStatus(userId, status, auth.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `User status updated to ${status}`,
        user: result.user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update user status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user status" },
      { status: 500 }
    );
  }
}
