import { connectToDatabase } from "@/lib/mongodb";
import DonorProjectAccess from "@/models/DonorProjectAccess";
import User from "@/models/User";
import Project from "@/models/Project";
import { logAudit } from "@/lib/audit";

/**
 * Service to manage explicit project authorization for Donors.
 * Enforces strict principle of least privilege:
 * Donors have NO access to any project unless explicitly granted by a Superadmin.
 */

/**
 * Returns an array of Project ObjectIds that the given donor user is actively authorized to view.
 */
export async function getAuthorizedProjectIdsForDonor(donorUserId) {
  await connectToDatabase();
  const grants = await DonorProjectAccess.find({
    donor: donorUserId,
    status: "active",
  }).select("project");

  const projectIds = grants.map((g) => g.project);

  // Filter to only active projects in the database
  const activeProjects = await Project.find({
    _id: { $in: projectIds },
    status: "active",
  }).select("_id");

  return activeProjects.map((p) => p._id);
}

/**
 * Verifies whether the authenticated user has permission to access a specific project.
 * - Superadmin: full administrative access.
 * - Donor: requires an active, unrevoked DonorProjectAccess grant for an active project.
 * - Field Worker / others: strictly denied (false).
 */
export async function verifyDonorProjectAccess(user, projectId) {
  if (!user || !projectId) return false;

  // Superadmins retain administrative oversight across all projects
  if (user.role === "superadmin") return true;

  // Field workers and non-donors are forbidden from donor analytics
  if (user.role !== "donor") return false;

  await connectToDatabase();

  // Validate that the project is active
  const project = await Project.findById(projectId);
  if (!project || project.status !== "active") {
    return false;
  }

  // Check for active grant
  const grant = await DonorProjectAccess.findOne({
    donor: user.id || user._id,
    project: projectId,
    status: "active",
  });

  return !!grant;
}

/**
 * Superadmin grants explicit project access to a Donor user.
 */
export async function grantDonorProjectAccess({ donorId, projectId, grantedBy, notes = "" }) {
  await connectToDatabase();

  // 1. Validate donor user exists and has role 'donor'
  const donorUser = await User.findById(donorId);
  if (!donorUser) {
    const error = new Error("Donor user not found");
    error.statusCode = 404;
    throw error;
  }

  if (donorUser.role !== "donor") {
    const error = new Error("Project access can only be granted to users with the 'donor' role");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate project exists and is active
  const targetProject = await Project.findById(projectId);
  if (!targetProject) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  if (targetProject.status !== "active") {
    const error = new Error("Cannot grant access to an inactive project");
    error.statusCode = 400;
    throw error;
  }

  // 3. Check for existing grant
  const existingGrant = await DonorProjectAccess.findOne({
    donor: donorId,
    project: projectId,
  });

  if (existingGrant && existingGrant.status === "active") {
    const error = new Error("Donor already has active access to this project");
    error.statusCode = 409;
    throw error;
  }

  let grantDoc;
  if (existingGrant) {
    // Reactivate previously revoked grant
    const beforeState = existingGrant.toObject();
    existingGrant.status = "active";
    existingGrant.grantedBy = grantedBy.id || grantedBy._id;
    existingGrant.grantedAt = new Date();
    existingGrant.revokedBy = null;
    existingGrant.revokedAt = null;
    if (notes) existingGrant.notes = notes;
    await existingGrant.save();
    grantDoc = existingGrant;

    await logAudit({
      actor: grantedBy,
      entityType: "DonorProjectAccess",
      entityId: existingGrant._id,
      action: "GRANT_ACCESS",
      before: beforeState,
      after: existingGrant.toObject(),
    });
  } else {
    // Create new grant
    grantDoc = await DonorProjectAccess.create({
      donor: donorId,
      project: projectId,
      status: "active",
      grantedBy: grantedBy.id || grantedBy._id,
      grantedAt: new Date(),
      notes,
    });

    await logAudit({
      actor: grantedBy,
      entityType: "DonorProjectAccess",
      entityId: grantDoc._id,
      action: "GRANT_ACCESS",
      before: null,
      after: grantDoc.toObject(),
    });
  }

  return grantDoc.toSafeObject();
}

/**
 * Superadmin revokes project access from a Donor user.
 */
export async function revokeDonorProjectAccess({ grantId, donorId, projectId, revokedBy, notes = "" }) {
  await connectToDatabase();

  let query = {};
  if (grantId) {
    query._id = grantId;
  } else if (donorId && projectId) {
    query.donor = donorId;
    query.project = projectId;
  } else {
    const error = new Error("Must provide grantId or both donorId and projectId to revoke");
    error.statusCode = 400;
    throw error;
  }

  const grant = await DonorProjectAccess.findOne(query);
  if (!grant) {
    const error = new Error("Access grant record not found");
    error.statusCode = 404;
    throw error;
  }

  if (grant.status === "revoked") {
    return grant.toSafeObject();
  }

  const beforeState = grant.toObject();
  grant.status = "revoked";
  grant.revokedBy = revokedBy.id || revokedBy._id;
  grant.revokedAt = new Date();
  if (notes) grant.notes = notes;
  await grant.save();

  await logAudit({
    actor: revokedBy,
    entityType: "DonorProjectAccess",
    entityId: grant._id,
    action: "REVOKE_ACCESS",
    before: beforeState,
    after: grant.toObject(),
  });

  return grant.toSafeObject();
}

/**
 * Lists all grants with donor and project population for Superadmin management.
 */
export async function listAllGrants({ donorId, projectId, status } = {}) {
  await connectToDatabase();

  const filter = {};
  if (donorId) filter.donor = donorId;
  if (projectId) filter.project = projectId;
  if (status) filter.status = status;

  const grants = await DonorProjectAccess.find(filter)
    .populate("donor", "name email role status")
    .populate("project", "name code status")
    .populate("grantedBy", "name email")
    .populate("revokedBy", "name email")
    .sort({ createdAt: -1 });

  return grants.map((g) => ({
    id: g._id.toString(),
    donorId: g.donor?._id?.toString() || g.donor?.toString(),
    donorName: g.donor?.name || "Unknown",
    donorEmail: g.donor?.email || "Unknown",
    donorStatus: g.donor?.status || "active",
    projectId: g.project?._id?.toString() || g.project?.toString(),
    projectName: g.project?.name || "Unknown",
    projectCode: g.project?.code || "Unknown",
    projectStatus: g.project?.status || "unknown",
    status: g.status,
    grantedByName: g.grantedBy?.name || "System",
    grantedAt: g.grantedAt,
    revokedByName: g.revokedBy?.name || null,
    revokedAt: g.revokedAt,
    notes: g.notes,
  }));
}
