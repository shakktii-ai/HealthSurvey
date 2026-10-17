import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

/**
 * Service to manage users, roles, and status changes for Superadmin operations.
 */

export async function listUsers() {
  await connectToDatabase();
  const users = await User.find()
    .sort({ createdAt: -1 })
    .select("-password -resetPasswordToken -resetPasswordExpires");

  return users.map((u) => u.toSafeObject());
}

export async function createUser({ name, email, password, role, status = "active" }) {
  if (!name || !email || !password) {
    return {
      success: false,
      error: "Name, email, and password are required",
      status: 400,
    };
  }

  const validRoles = ["superadmin", "field_worker", "donor"];
  if (role && !validRoles.includes(role)) {
    return {
      success: false,
      error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      status: 400,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  await connectToDatabase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return {
      success: false,
      error: "A user with this email already exists",
      status: 409,
    };
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: role || "field_worker",
    status: status || "active",
  });

  return {
    success: true,
    user: newUser.toSafeObject(),
    status: 201,
  };
}

export async function toggleUserStatus(userId, newStatus, requestingUserId) {
  if (userId === requestingUserId) {
    return {
      success: false,
      error: "You cannot change your own account status",
      status: 400,
    };
  }

  if (!["active", "inactive"].includes(newStatus)) {
    return {
      success: false,
      error: "Status must be either 'active' or 'inactive'",
      status: 400,
    };
  }

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) {
    return {
      success: false,
      error: "User not found",
      status: 404,
    };
  }

  user.status = newStatus;
  await user.save();

  return {
    success: true,
    user: user.toSafeObject(),
    status: 200,
  };
}
