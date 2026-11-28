import type { PrismaClient } from "../../generated/prisma/client";
import type { AuthUser } from "./auth-core.ts";
import { isSameOriginMutation } from "./same-origin.ts";
import { readJson, RequestBodyError } from "./request-body.ts";

const noStore = { "Cache-Control": "no-store" };
const statuses = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
const pageSize = 25;

function errorResponse(message: string, status: number, code: string) {
  return Response.json({ error: message, code }, { status, headers: noStore });
}

function parseProfileInput(body: Record<string, unknown>) {
  const allowed = new Set(["organizationName", "website", "supportEmail", "description", "applicationReason"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return null;

  const text = (key: string, max: number, required = false) => {
    const value = body[key];
    if (value === undefined && !required) return undefined;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if ((!trimmed && required) || trimmed.length > max || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
    return trimmed || null;
  };
  const organizationName = text("organizationName", 160);
  const website = text("website", 2048);
  const supportEmail = text("supportEmail", 254);
  const description = text("description", 2000);
  const applicationReason = text("applicationReason", 1000, true);
  if ([organizationName, website, supportEmail, description, applicationReason].includes(null)) return null;
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) return null;
  if (website) {
    try {
      const parsed = new URL(website);
      if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return null;
    } catch {
      return null;
    }
  }
  return { organizationName, website, supportEmail, description, applicationReason };
}

export async function handleDeveloperProfile(
  request: Request,
  user: AuthUser,
  repository: () => PrismaClient,
) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) {
    return errorResponse("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  }
  if (!["USER", "DEVELOPER"].includes(user.role)) {
    return errorResponse("A Developer account is required.", 403, "FORBIDDEN");
  }

  try {
    const db = repository();
    if (request.method === "GET") {
      const profile = await db.apiDeveloperProfile.findUnique({
        where: { userId: user.id },
        select: {
          userId: true, status: true, organizationName: true, website: true, supportEmail: true,
          description: true, applicationReason: true, rejectionReason: true, submittedAt: true,
          reviewedAt: true, createdAt: true, updatedAt: true,
        },
      });
      return Response.json({ profile }, { headers: noStore });
    }

    const body = await readJson(request, 8_000);
    if (!body) return errorResponse("Profile details are required.", 422, "INVALID_INPUT");
    const values = parseProfileInput(body);
    if (!values) return errorResponse("Enter valid Developer profile details.", 422, "INVALID_INPUT");

    if (request.method === "POST") {
      const outcome = await db.$transaction(async (transaction) => {
        const existing = await transaction.apiDeveloperProfile.findUnique({
          where: { userId: user.id },
          select: { status: true },
        });
        if (existing?.status === "VERIFIED") return { kind: "verified" as const };
        if (existing?.status === "SUSPENDED") return { kind: "suspended" as const };
        if (existing?.status === "PENDING") return { kind: "pending" as const };

        const profile = existing
          ? await transaction.apiDeveloperProfile.update({
              where: { userId: user.id },
              data: {
                ...values,
                status: "PENDING",
                rejectionReason: null,
                reviewedAt: null,
                reviewedByUserId: null,
                submittedAt: new Date(),
              },
            })
          : await transaction.apiDeveloperProfile.create({
              data: { userId: user.id, ...values, status: "PENDING" },
            });
        await transaction.apiPlatformAuditLog.create({
          data: {
            actorUserId: user.id,
            action: existing ? "DEVELOPER_RESUBMITTED" : "DEVELOPER_APPLIED",
            targetType: "DEVELOPER_PROFILE",
            targetId: user.id,
            details: { status: "PENDING" },
          },
        });
        return { kind: "submitted" as const, profile };
      });
      if (outcome.kind === "verified") return errorResponse("This account is already a verified Developer.", 409, "ALREADY_VERIFIED");
      if (outcome.kind === "suspended") return errorResponse("Contact LIFE support to review this Developer account.", 403, "ACCOUNT_SUSPENDED");
      if (outcome.kind === "pending") return errorResponse("A Developer application is already under review.", 409, "APPLICATION_PENDING");
      return Response.json({ profile: outcome.profile }, { status: 201, headers: noStore });
    }

    if (request.method === "PATCH") {
      const profile = await db.apiDeveloperProfile.findUnique({
        where: { userId: user.id },
        select: { status: true },
      });
      if (!profile) return errorResponse("Submit a Developer application before editing this profile.", 404, "PROFILE_NOT_FOUND");
      if (profile.status === "SUSPENDED") return errorResponse("Suspended Developer profiles cannot be edited.", 403, "ACCOUNT_SUSPENDED");
      const updated = await db.apiDeveloperProfile.update({
        where: { userId: user.id },
        data: values,
        select: {
          userId: true, status: true, organizationName: true, website: true, supportEmail: true,
          description: true, applicationReason: true, rejectionReason: true, submittedAt: true,
          reviewedAt: true, createdAt: true, updatedAt: true,
        },
      });
      await db.apiPlatformAuditLog.create({
        data: {
          actorUserId: user.id,
          action: "DEVELOPER_PROFILE_UPDATED",
          targetType: "DEVELOPER_PROFILE",
          targetId: user.id,
          details: { status: updated.status },
        },
      });
      return Response.json({ profile: updated }, { headers: noStore });
    }

    return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return errorResponse(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    }
    console.error("Developer profile request could not complete.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("Developer profile service is temporarily unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}

function isProfileStatus(value: string): value is (typeof statuses)[number] {
  return (statuses as readonly string[]).includes(value);
}

export async function handleSuperAdminDevelopers(
  request: Request,
  actor: AuthUser,
  repository: () => PrismaClient,
) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) {
    return errorResponse("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  }
  if (actor.role !== "SUPER_ADMIN") return errorResponse("Super Admin access is required.", 403, "FORBIDDEN");

  try {
    const db = repository();
    if (request.method === "GET") {
      const url = new URL(request.url);
      const params = url.searchParams;
      const allowed = new Set(["page", "q", "status"]);
      if ([...params.keys()].some((key) => !allowed.has(key)) || [...allowed].some((key) => params.getAll(key).length > 1)) {
        return errorResponse("Developer filters are invalid.", 400, "INVALID_FILTERS");
      }
      const rawPage = params.get("page") ?? "1";
      if (!/^[1-9]\d{0,4}$/.test(rawPage)) return errorResponse("Page is invalid.", 400, "INVALID_FILTERS");
      const page = Number(rawPage);
      const query = (params.get("q") ?? "").trim();
      if (query.length > 254 || /[\u0000-\u001f\u007f]/.test(query)) return errorResponse("Search text is invalid.", 400, "INVALID_FILTERS");
      const rawStatus = params.get("status");
      if (rawStatus && rawStatus !== "ALL" && !isProfileStatus(rawStatus)) return errorResponse("Status filter is invalid.", 400, "INVALID_FILTERS");
      const where = {
        ...(rawStatus && rawStatus !== "ALL" ? { status: rawStatus as (typeof statuses)[number] } : {}),
        ...(query ? {
          OR: [
            { organizationName: { contains: query, mode: "insensitive" as const } },
            { user: { is: { OR: [
              { fullName: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { id: { contains: query, mode: "insensitive" as const } },
            ] } } },
          ],
        } : {}),
      };
      const [total, profiles, pending, verified, rejected, suspended] = await Promise.all([
        db.apiDeveloperProfile.count({ where }),
        db.apiDeveloperProfile.findMany({
          where,
          orderBy: [{ submittedAt: "desc" }, { userId: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            userId: true, status: true, organizationName: true, website: true, supportEmail: true,
            description: true, applicationReason: true, rejectionReason: true, submittedAt: true,
            reviewedAt: true, user: { select: { id: true, fullName: true, email: true, role: true, createdAt: true } },
          },
        }),
        db.apiDeveloperProfile.count({ where: { status: "PENDING" } }),
        db.apiDeveloperProfile.count({ where: { status: "VERIFIED" } }),
        db.apiDeveloperProfile.count({ where: { status: "REJECTED" } }),
        db.apiDeveloperProfile.count({ where: { status: "SUSPENDED" } }),
      ]);
      return Response.json({
        profiles,
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
        summary: { pending, verified, rejected, suspended, total },
      }, { headers: noStore });
    }
    if (request.method !== "PATCH") return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
    const userId = new URL(request.url).pathname.split("/").filter(Boolean).pop();
    if (!userId || userId.length > 64) return errorResponse("Developer identifier is invalid.", 422, "INVALID_USER_ID");
    const body = await readJson(request, 2_000);
    if (!body || !["verify", "reject", "suspend", "reactivate"].includes(String(body.action))) {
      return errorResponse("Choose a valid Developer review action.", 422, "INVALID_ACTION");
    }
    const action = body.action as "verify" | "reject" | "suspend" | "reactivate";
    const reason = body.reason;
    if (action === "reject" && (typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000)) {
      return errorResponse("A rejection reason is required.", 422, "REJECTION_REASON_REQUIRED");
    }
    if (Object.keys(body).some((key) => key !== "action" && key !== "reason")
      || (action !== "reject" && reason !== undefined)) {
      return errorResponse("Review details are invalid.", 422, "INVALID_INPUT");
    }

    const result = await db.$transaction(async (transaction) => {
      const profile = await transaction.apiDeveloperProfile.findUnique({
        where: { userId },
        select: { status: true, user: { select: { role: true } } },
      });
      if (!profile) return { kind: "missing" as const };
      const transitions = {
        verify: profile.status === "PENDING" && profile.user.role === "USER",
        reject: profile.status === "PENDING" && profile.user.role === "USER",
        suspend: profile.status === "VERIFIED" && profile.user.role === "DEVELOPER",
        reactivate: profile.status === "SUSPENDED" && profile.user.role === "DEVELOPER",
      };
      if (!transitions[action]) return { kind: "invalid-transition" as const, status: profile.status };
      const nextStatus = action === "verify" || action === "reactivate" ? "VERIFIED"
        : action === "reject" ? "REJECTED" : "SUSPENDED";
      const updated = await transaction.apiDeveloperProfile.updateMany({
        where: { userId, status: profile.status },
        data: {
          status: nextStatus,
          rejectionReason: action === "reject" ? (reason as string).trim() : null,
          reviewedAt: new Date(),
          reviewedByUserId: actor.id,
        },
      });
      if (updated.count !== 1) throw new Error("Concurrent Developer status transition detected.");
      if (action === "verify") {
        const promoted = await transaction.user.updateMany({
          where: { id: userId, role: "USER" },
          data: { role: "DEVELOPER" },
        });
        if (promoted.count !== 1) throw new Error("Developer promotion did not complete.");
      }
      await transaction.apiPlatformAuditLog.create({
        data: {
          actorUserId: actor.id,
          action: `DEVELOPER_${action.toUpperCase()}`,
          targetType: "DEVELOPER_PROFILE",
          targetId: userId,
          details: action === "reject"
            ? { status: nextStatus, reason: (reason as string).trim() }
            : { status: nextStatus },
        },
      });
      return { kind: "updated" as const, status: nextStatus };
    }, { isolationLevel: "Serializable" });

    if (result.kind === "missing") return errorResponse("Developer application not found.", 404, "NOT_FOUND");
    if (result.kind === "invalid-transition") return errorResponse(`Cannot ${action} a Developer profile in ${result.status} status.`, 409, "INVALID_STATUS_TRANSITION");
    return Response.json({ userId, status: result.status }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return errorResponse(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    console.error("Super Admin Developer management request could not complete.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("Developer management service is temporarily unavailable.", 503, "SERVICE_UNAVAILABLE");
  }
}
