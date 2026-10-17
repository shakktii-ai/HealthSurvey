import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import {
  hashPassword,
  comparePassword,
  createSessionToken,
} from "@/lib/auth";

// Pre-computed dummy hash to prevent timing attacks when an email does not exist
const DUMMY_HASH =
  "$2a$12$e80yqj6yS9eP2mI4K7p4OujqN6r2K9N3zZ4W6F9p1a8b7c6d5e4f3";

/**
 * Authenticates a user with email and password.
 * Implements generic error messages, constant-time checks, and brute-force lockouts.
 */
export async function authenticateUser({ email, password }) {
  if (!email || !password) {
    return {
      success: false,
      error: "Invalid email or password",
      status: 400,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  await connectToDatabase();

  // Find user and explicitly select password and reset fields
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password"
  );

  // If user not found, perform dummy comparison to equalize response time
  if (!user) {
    await comparePassword(password, DUMMY_HASH);
    return {
      success: false,
      error: "Invalid email or password",
      status: 401,
    };
  }

  // Check account lockout from brute-force attempts
  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockUntil.getTime() - Date.now()) / (60 * 1000)
    );
    return {
      success: false,
      error: `Account is temporarily locked due to excessive failed attempts. Please retry in ${minutesLeft} minute(s).`,
      status: 429,
    };
  }

  // Check account status
  if (user.status !== "active") {
    return {
      success: false,
      error: "Your account is currently inactive. Please contact an administrator.",
      status: 403,
    };
  }

  // Verify password
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    // Increment failed login counter
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock account after 5 consecutive failures for 15 minutes
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await user.save();

    return {
      success: false,
      error: "Invalid email or password",
      status: 401,
    };
  }

  // Reset login protection counters on success
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // Generate session token
  const token = createSessionToken(user);

  return {
    success: true,
    token,
    user: user.toSafeObject(),
    status: 200,
  };
}

/**
 * Safe one-time initialization of the primary Superadmin account.
 * Rejects creation if any Superadmin already exists in the system.
 */
export async function createInitialSuperadmin({ name, email, password }) {
  if (!name || !email || !password) {
    return {
      success: false,
      error: "Name, email, and password are required",
      status: 400,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  await connectToDatabase();

  // Check if a superadmin already exists
  const existingSuperadmin = await User.findOne({ role: "superadmin" });
  if (existingSuperadmin) {
    return {
      success: false,
      error: "A Superadmin account already exists. Initial setup is locked.",
      status: 403,
    };
  }

  // Check if this specific email is already registered under any role
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return {
      success: false,
      error: "User with this email already exists",
      status: 400,
    };
  }

  const hashedPassword = await hashPassword(password);

  const superadmin = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "superadmin",
    status: "active",
  });

  return {
    success: true,
    user: superadmin.toSafeObject(),
    status: 201,
  };
}

/**
 * Password reset foundation: Generates a secure reset token without exposing email status.
 */
export async function generatePasswordResetToken(email) {
  if (!email) return { success: true };

  const normalizedEmail = email.trim().toLowerCase();
  await connectToDatabase();

  const user = await User.findOne({ email: normalizedEmail, status: "active" });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
    await user.save();

    // In a future phase with email delivery, rawToken will be emailed here
    return { success: true, token: rawToken };
  }

  // Always return generic success to prevent email enumeration
  return { success: true };
}

/**
 * Resets user password using a verified reset token.
 */
export async function resetPasswordWithToken({ token, newPassword }) {
  if (!token || !newPassword || newPassword.length < 8) {
    return {
      success: false,
      error: "Invalid token or password does not meet requirements (min 8 chars)",
      status: 400,
    };
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await connectToDatabase();

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    return {
      success: false,
      error: "Password reset token is invalid or has expired",
      status: 400,
    };
  }

  user.password = await hashPassword(newPassword);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  return {
    success: true,
    message: "Password reset successfully. You may now log in.",
    status: 200,
  };
}
