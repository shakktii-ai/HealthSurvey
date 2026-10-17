import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const COOKIE_NAME = "auth_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Server-side session secret with development fallback
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION: SESSION_SECRET must be defined in production."
      );
    }
    // Safe development fallback so local work runs without crashing if secret is unset
    return "dev_fallback_secret_health_survey_2026_super_secure_key_12345";
  }
  return secret;
}

/**
 * Hash password securely with bcrypt salt rounds.
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plain password with bcrypt hash.
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create a cryptographically signed session token.
 * Format: base64url(payload).signature
 */
export function createSessionToken(user) {
  const secret = getSessionSecret();
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed session token.
 * Returns payload object if valid and not expired, null otherwise.
 */
export function verifySessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== "string") return null;

  const parts = tokenString.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const secret = getSessionSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Cookie options for secure session storage.
 */
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

/**
 * Server-side helper to fetch the current authenticated user from cookie.
 * Validates token, connects to DB, checks active status, and returns safe user.
 */
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const sessionPayload = verifySessionToken(token);
    if (!sessionPayload) return null;

    await connectToDatabase();
    const user = await User.findById(sessionPayload.userId);

    // Inactive users or deleted users are strictly disallowed
    if (!user || user.status !== "active") {
      return null;
    }

    return user.toSafeObject();
  } catch (error) {
    console.error("Error retrieving session user:", error.message);
    return null;
  }
}

/**
 * Server-side authorization guard for Route Handlers and Server Components.
 * @param {string[]} allowedRoles - Array of roles permitted to access the resource
 */
export async function requireAuth(allowedRoles = []) {
  const user = await getSessionUser();

  if (!user) {
    return {
      authenticated: false,
      authorized: false,
      user: null,
      error: "Authentication required. Please sign in.",
      status: 401,
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      authenticated: true,
      authorized: false,
      user,
      error: `Access denied. Requires one of: ${allowedRoles.join(", ")}`,
      status: 403,
    };
  }

  return {
    authenticated: true,
    authorized: true,
    user,
    error: null,
    status: 200,
  };
}
