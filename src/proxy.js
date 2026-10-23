import { NextResponse } from "next/server";

const COOKIE_NAME = "auth_session";

function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    "dev_fallback_secret_health_survey_2026_super_secure_key_12345"
  );
}

/**
 * Universal HMAC-SHA256 signature verifier using Web Crypto API.
 * Runs seamlessly on Next.js Edge, Node.js, and Vercel serverless.
 */
async function verifyTokenEdge(tokenString, secret) {
  if (!tokenString || typeof tokenString !== "string") return null;
  const parts = tokenString.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const data = encoder.encode(payloadB64);

    // Normalize base64url to standard base64
    let base64Sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) {
      base64Sig += "=";
    }

    const sigBinary = atob(base64Sig);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;

    let base64Payload = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Payload.length % 4) {
      base64Payload += "=";
    }

    const payloadJson = decodeURIComponent(
      atob(base64Payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = getSecret();

  const session = await verifyTokenEdge(token, secret);

  const isAdminRoute = pathname.startsWith("/admin");
  const isFieldRoute = pathname.startsWith("/field");
  const isDonorRoute = pathname.startsWith("/donor");

  // Protected route check
  if (isAdminRoute || isFieldRoute || isDonorRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      // Immediately clear invalid/expired/stale cookies to prevent redirect loops
      if (token) {
        response.cookies.delete(COOKIE_NAME);
      }
      return response;
    }

    // Role-based authorization rules (safe fallbacks without redirect loops)
    if (isAdminRoute && session.role !== "superadmin") {
      const target =
        session.role === "donor"
          ? "/donor/dashboard"
          : session.role === "field_worker"
          ? "/field/dashboard"
          : "/";
      if (pathname === target) {
        return NextResponse.next();
      }
      const fallbackUrl = new URL(target, request.url);
      fallbackUrl.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(fallbackUrl);
    }

    if (isFieldRoute && session.role !== "field_worker" && session.role !== "superadmin") {
      const target = session.role === "donor" ? "/donor/dashboard" : "/";
      if (pathname === target) {
        return NextResponse.next();
      }
      const fallbackUrl = new URL(target, request.url);
      fallbackUrl.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(fallbackUrl);
    }

    if (isDonorRoute && session.role !== "donor" && session.role !== "superadmin") {
      const target = session.role === "field_worker" ? "/field/dashboard" : "/";
      if (pathname === target) {
        return NextResponse.next();
      }
      const fallbackUrl = new URL(target, request.url);
      fallbackUrl.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: ["/admin/:path*", "/field/:path*", "/donor/:path*"],
};

