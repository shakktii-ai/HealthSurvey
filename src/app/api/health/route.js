import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Health check and MongoDB connection verification endpoint.
 * GET /api/health
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const hasMongoUri = Boolean(process.env.MONGODB_URI);

  let dbStatus = {
    configured: hasMongoUri,
    connected: false,
    message: hasMongoUri
      ? "Attempting connection..."
      : "MONGODB_URI not configured in .env.local",
  };

  if (hasMongoUri) {
    try {
      const conn = await connectToDatabase();
      const readyState = conn.connection.readyState;
      // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
      dbStatus = {
        configured: true,
        connected: readyState === 1,
        readyState,
        message: readyState === 1 ? "Connected to MongoDB Atlas" : "Connecting",
      };
    } catch (error) {
      const isLocalhost = process.env.MONGODB_URI?.includes("127.0.0.1") || process.env.MONGODB_URI?.includes("localhost");
      let hint = undefined;
      if (isLocalhost && process.env.NODE_ENV === "production") {
        hint = "MONGODB_URI is set to localhost on Vercel production. Update Vercel Project Settings > Environment Variables with your MongoDB Atlas cloud URI.";
      } else if (error.message?.includes("timed out") || error.message?.includes("Server selection") || error.message?.includes("buffering timed out")) {
        hint = "Connection timed out. In MongoDB Atlas, verify Network Access has 0.0.0.0/0 (Allow access from anywhere) enabled so Vercel serverless IPs can reach it.";
      } else if (error.message?.includes("bad auth") || error.message?.includes("Authentication failed")) {
        hint = "MongoDB credentials rejected. Verify database username and password in MONGODB_URI.";
      }

      dbStatus = {
        configured: true,
        connected: false,
        message: "Failed to connect to MongoDB",
        details: error.message?.includes("ENOTFOUND")
          ? "Host not reachable"
          : error.message?.includes("ECONNREFUSED")
          ? "Connection refused"
          : "Database connection failed",
        hint,
      };
    }
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "Family Verification & Health Impact Survey Management System",
      phase: "Phase 00: Project Foundation Setup",
      timestamp,
      runtime: "Node.js Route Handler",
      database: dbStatus,
    },
    { status: 200 }
  );
}
