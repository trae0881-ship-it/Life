import type { UserRole } from "./auth-core.ts";
import {
  auditLogWhere,
  parseSuperAdminAuditFilters,
  type SuperAdminAuditEvent,
} from "./super-admin-audit-logs.ts";

const PAGE_SIZE = 25;

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type AuditRepository = {
  $transaction<T>(callback: (transaction: {
    superAdminAccessLog: {
      count(args: { where: ReturnType<typeof auditLogWhere> }): Promise<number>;
      findMany(args: {
        where: ReturnType<typeof auditLogWhere>;
        orderBy: [{ createdAt: "desc" }, { id: "desc" }];
        skip: number;
        take: number;
        select: {
          id: true;
          actorUserId: true;
          actorLabel: true;
          action: true;
          page: true;
          resultCount: true;
          targetUserId: true;
          fromRole: true;
          toRole: true;
          createdAt: true;
        };
      }): Promise<SuperAdminAuditEvent[]>;
    };
  }) => Promise<T>): Promise<T>;
};

type AuditHandlerDependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  repository(): AuditRepository;
};

export async function handleSuperAdminAuditLogs(request: Request, dependencies: AuditHandlerDependencies) {
  try {
    const auth = await dependencies.authorize(request, ["SUPER_ADMIN"]);
    if (auth.status !== 200 || !auth.user) {
      const status = auth.status === 401 ? 401 : 403;
      return Response.json(
        {
          error: status === 401 ? "Sign in is required." : "Super Admin access is required.",
          code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const filters = parseSuperAdminAuditFilters(new URL(request.url).searchParams);
    if (!filters.ok) {
      return Response.json(
        { error: "The audit-log filters or page are invalid.", code: "INVALID_QUERY" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const { page } = filters.value;
    const where = auditLogWhere(filters.value);
    const skip = (page - 1) * PAGE_SIZE;
    const result = await dependencies.repository().$transaction(async (transaction) => {
      const [total, events] = await Promise.all([
        transaction.superAdminAccessLog.count({ where }),
        transaction.superAdminAccessLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            actorUserId: true,
            actorLabel: true,
            action: true,
            page: true,
            resultCount: true,
            targetUserId: true,
            fromRole: true,
            toRole: true,
            createdAt: true,
          },
        }),
      ]);
      return { total, events };
    });

    return Response.json(
      {
        events: result.events.map((event) => ({
          id: event.id,
          actorUserId: event.actorUserId,
          actorLabel: event.actorLabel,
          action: event.action,
          page: event.page,
          resultCount: event.resultCount,
          targetUserId: event.targetUserId,
          fromRole: event.fromRole,
          toRole: event.toRole,
          createdAt: event.createdAt,
        })),
        page,
        pageSize: PAGE_SIZE,
        total: result.total,
        pageCount: Math.ceil(result.total / PAGE_SIZE),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Audit logs are temporarily unavailable.", code: "DATABASE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
