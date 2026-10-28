import type { UserRole } from "./auth-core.ts";
import { parseSuperAdminUserFilters } from "./super-admin-users.ts";

const PAGE_SIZE = 25;

type Authorization = {
  status: 200 | 401 | 403;
  user: { id: string } | null;
};

type UserWhere = {
  role?: UserRole;
  OR?: Array<
    | { id: { startsWith: string } }
    | { email: { startsWith: string; mode: "insensitive" } }
    | { fullName: { contains: string; mode: "insensitive" } }
  >;
};

type UserRecord = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: Date;
  _count: { profiles: number };
};

type UserRepository = {
  $transaction<T>(callback: (transaction: {
    user: {
      count(args: { where: UserWhere }): Promise<number>;
      findMany(args: {
        where: UserWhere;
        orderBy: [{ createdAt: "desc" }, { id: "desc" }];
        skip: number;
        take: number;
        select: {
          id: true;
          email: true;
          role: true;
          createdAt: true;
          fullName: true;
          _count: { select: { profiles: true } };
        };
      }): Promise<UserRecord[]>;
    };
    superAdminAccessLog: {
      create(args: {
        data: {
          actorUserId: string;
          action: "USER_LIST_READ" | "USER_FILTERED_READ";
          page: number;
          resultCount: number;
        };
        select: { id: true };
      }): Promise<{ id: string }>;
    };
  }) => Promise<T>): Promise<T>;
};

type HandlerDependencies = {
  authorize(request: Request, allowed: readonly UserRole[]): Promise<Authorization>;
  repository(): UserRepository;
};

export async function handleSuperAdminUsers(request: Request, dependencies: HandlerDependencies) {
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

    const actorUserId = auth.user.id;
    const filters = parseSuperAdminUserFilters(new URL(request.url).searchParams);
    if (!filters.ok) {
      return Response.json(
        { error: "The account search or page is invalid.", code: "INVALID_QUERY" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const { page, role, query } = filters.value;
    const where = {
      ...(role ? { role } : {}),
      ...(query ? {
        OR: [
          { id: { startsWith: query } },
          { email: { startsWith: query, mode: "insensitive" as const } },
          { fullName: { contains: query, mode: "insensitive" as const } },
        ],
      } : {}),
    };
    const skip = (page - 1) * PAGE_SIZE;
    const result = await dependencies.repository().$transaction(async (transaction) => {
      const [total, users] = await Promise.all([
        transaction.user.count({ where }),
        transaction.user.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            fullName: true,
            _count: { select: { profiles: true } },
          },
        }),
      ]);
      await transaction.superAdminAccessLog.create({
        data: {
          actorUserId,
          action: role || query ? "USER_FILTERED_READ" : "USER_LIST_READ",
          page,
          resultCount: users.length,
        },
        select: { id: true },
      });
      return { total, users };
    });

    return Response.json(
      {
        users: result.users.map(({ id, email, fullName, role, createdAt, _count }) => ({
          id,
          email,
          fullName,
          role,
          createdAt,
          profileCount: _count.profiles,
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
      { error: "Account inspection is temporarily unavailable.", code: "DATABASE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
