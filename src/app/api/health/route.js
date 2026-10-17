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
      dbStatus = {
        configured: true,
        connected: false,
        message: "Failed to connect to MongoDB",
        // Only return generic error message without exposing connection credentials
        details: error.message?.includes("ENOTFOUND")
          ? "Host not reachable"
          : "Database connection failed",
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
