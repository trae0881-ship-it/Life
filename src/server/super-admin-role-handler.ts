import type { UserRole } from "./auth-core.ts";
import { isSameOriginMutation } from "./same-origin.ts";
import { readJson, RequestBodyError } from "./request-body.ts";

const ASSIGNABLE_ROLES = ["USER", "DEVELOPER", "ADMIN"] as const;

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type RoleRepository = {
  $transaction<T>(
    callback: (transaction: {
      user: {
        findUnique(args: { where: { id: string }; select: { id: true; role: true } }): Promise<{ id: string; role: UserRole } | null>;
        updateMany(args: { where: { id: string; role: UserRole }; data: { role: typeof ASSIGNABLE_ROLES[number] } }): Promise<{ count: number }>;
      };
      superAdminAccessLog: {
        create(args: {
          data: {
            actorUserId: string;
            action: "USER_ROLE_CHANGED";
            page: number;
            resultCount: number;
            targetUserId: string;
            fromRole: UserRole;
            toRole: typeof ASSIGNABLE_ROLES[number];
          };
          select: { id: true };
        }): Promise<{ id: string }>;
      };
    }) => Promise<T>,
    options: { isolationLevel: "Serializable" },
  ): Promise<T>;
};

type Dependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  repository(): RoleRepository;
};

function jsonError(error: string, status: number, code: string) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleSuperAdminRoleChange(
  request: Request,
  userId: string,
  dependencies: Dependencies,
) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  try {
    const auth = await dependencies.authorize(request, ["SUPER_ADMIN"]);
    if (auth.status !== 200 || !auth.user) {
      return jsonError(
        auth.status === 401 ? "Sign in is required." : "Super Admin access is required.",
        auth.status,
        auth.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      );
    }
    const actorUserId = auth.user.id;

    const body = await readJson(request, 2_000);
    if (!body || Object.keys(body).length !== 1 || !ASSIGNABLE_ROLES.includes(body.role as typeof ASSIGNABLE_ROLES[number])) {
      return jsonError("Choose an assignable account role.", 422, "INVALID_ROLE");
    }
    if (!userId || userId.length > 64) return jsonError("The account identifier is invalid.", 422, "INVALID_USER_ID");
    if (userId === actorUserId) return jsonError("You cannot change your own role.", 403, "SELF_ROLE_CHANGE_FORBIDDEN");

    const outcome = await dependencies.repository().$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (!target) return { kind: "missing" as const };
      if (target.role === "SUPER_ADMIN") return { kind: "protected" as const };
      const toRole = body.role as typeof ASSIGNABLE_ROLES[number];
      if (target.role === toRole) return { kind: "unchanged" as const, role: target.role };

      const changed = await transaction.user.updateMany({
        where: { id: target.id, role: target.role },
        data: { role: toRole },
      });
      if (changed.count !== 1) throw new Error("Concurrent role change detected.");
      await transaction.superAdminAccessLog.create({
        data: {
          actorUserId,
          action: "USER_ROLE_CHANGED",
          page: 0,
          resultCount: 1,
          targetUserId: target.id,
          fromRole: target.role,
          toRole,
        },
        select: { id: true },
      });
      return { kind: "updated" as const, role: toRole };
    }, { isolationLevel: "Serializable" });

    if (outcome.kind === "missing") return jsonError("Account not found.", 404, "NOT_FOUND");
    if (outcome.kind === "protected") return jsonError("SUPER_ADMIN accounts cannot be changed through user management.", 403, "SUPER_ADMIN_PROTECTED");
    return Response.json({ userId, role: outcome.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    return jsonError("Role management is temporarily unavailable.", 503, "DATABASE_UNAVAILABLE");
  }
}
