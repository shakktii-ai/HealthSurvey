import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

function formatLogDescription(log) {
  const entity = log.entityType || "Record";
  const action = log.action || "ACTION";

  switch (action) {
    case "CREATE":
      return `Created new ${entity}`;
    case "UPDATE":
      return `Updated ${entity} details`;
    case "DELETE":
      return `Deleted ${entity} record`;
    case "STATUS_CHANGE":
      return `Changed ${entity} status`;
    case "RESOLVE":
      return `Resolved ${entity} anomaly`;
    case "ACKNOWLEDGE":
      return `Acknowledged ${entity}`;
    case "AMEND":
      return `Amended submitted survey response`;
    case "SCAN_COMPLETE":
      return `Completed automated data quality scan`;
    case "SUBMIT":
      return `Field worker submitted survey response`;
    case "DRAFT":
      return `Field worker saved survey response draft`;
    case "ASSIGN":
      return `Assigned ${entity} to worker`;
    case "IMPORT":
      return `Bulk imported ${entity} records`;
    default:
      return `${action} on ${entity}`;
  }
}

export async function GET(request) {
  const auth = await requireAuth(["superadmin"]);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const category = searchParams.get("category") || "all";
    const entityType = searchParams.get("entityType") || "";
    const action = searchParams.get("action") || "";
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const filter = {};

    // Role / Category filter
    if (category === "worker") {
      filter.actorRole = "field_worker";
    } else if (category === "admin") {
      filter.actorRole = { $in: ["superadmin", "admin"] };
    } else if (category === "donor") {
      filter.actorRole = "donor";
    }

    // Entity Module Filter
    if (entityType && entityType !== "all") {
      filter.entityType = entityType;
    }

    // Action Filter
    if (action && action !== "all") {
      filter.action = action;
    }

    // Date Range Filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    // Text Search
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { actorEmail: searchRegex },
        { entityType: searchRegex },
        { action: searchRegex },
        { entityId: searchRegex },
      ];
    }

    // Query logs and total count in parallel
    const skip = (page - 1) * limit;
    const [rawLogs, totalCount] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // Aggregate statistics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalAllLogs, totalAdminLogs, totalWorkerLogs, total24hLogs, distinctEntities, distinctActions] =
      await Promise.all([
        AuditLog.countDocuments({}),
        AuditLog.countDocuments({ actorRole: { $in: ["superadmin", "admin"] } }),
        AuditLog.countDocuments({ actorRole: "field_worker" }),
        AuditLog.countDocuments({ timestamp: { $gte: oneDayAgo } }),
        AuditLog.distinct("entityType"),
        AuditLog.distinct("action"),
      ]);

    const formattedLogs = rawLogs.map((log) => {
      const timestamp = log.timestamp || log.createdAt || (log._id && typeof log._id.getTimestamp === "function" ? log._id.getTimestamp() : new Date());
      const role = log.actorRole || (log.actorEmail?.includes("worker") ? "field_worker" : "superadmin");

      return {
        id: log._id.toString(),
        actorId: log.actorId ? log.actorId.toString() : null,
        actorEmail: log.actorEmail || "system@healthsurvey.org",
        actorRole: role,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId || "",
        description: formatLogDescription(log),
        ipAddress: log.ipAddress || "Internal",
        userAgent: log.userAgent || "",
        before: log.before || null,
        after: log.after || null,
        timestamp,
      };
    });

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats: {
        totalAll: totalAllLogs,
        adminCount: totalAdminLogs,
        workerCount: totalWorkerLogs,
        past24hCount: total24hLogs,
      },
      filterOptions: {
        entityTypes: distinctEntities.sort(),
        actions: distinctActions.sort(),
      },
    });
  } catch (error) {
    console.error("Audit logs API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
