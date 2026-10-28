import { cookies } from "next/headers";
import type { PrismaClient } from "../../generated/prisma/client";
import { getPrisma } from "./db";
import {
  AUTH_COOKIE_NAME,
  authenticateCredentials as authenticate,
  createSession as create,
  findSession as find,
  getUserFromRequest as userFromRequest,
  roleAllowed,
  registerAccount as register,
  revokeSession as revoke,
  sessionTokenFromRequest,
  type AuthRepository,
  type UserRole,
} from "./auth-core";
import type { AuthUser } from "./auth-core";

export * from "./auth-core";

export async function registerAccount(input: { fullName: unknown; email: unknown; password: unknown; confirmPassword: unknown; termsVersion: unknown; acceptedTerms: unknown }, repository?: AuthRepository) {
  return register(input, repository ?? getPrisma());
}

export async function registerAccountWithSession(input: { fullName: unknown; email: unknown; password: unknown; confirmPassword: unknown; termsVersion: unknown; acceptedTerms: unknown }, repository: PrismaClient = getPrisma()) {
  return repository.$transaction(async (transaction) => {
    const user = await register(input, transaction);
    const session = await create(user.id, transaction);
    return { user, ...session };
  });
}

export async function authenticateCredentials(input: { email: unknown; password: unknown }, repository?: AuthRepository) {
  return authenticate(input, repository ?? getPrisma());
}

export async function createSession(userId: string, repository?: AuthRepository, now = new Date()) {
  return create(userId, repository ?? getPrisma(), now);
}

export async function findSession(token: string | undefined, repository?: AuthRepository, now = new Date()) {
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  return find(token, repository ?? getPrisma(), now);
}

export async function revokeSession(token: string | undefined, repository?: AuthRepository) {
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return 0;
  return revoke(token, repository ?? getPrisma());
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  return (await findSession(cookieStore.get(AUTH_COOKIE_NAME)?.value))?.user ?? null;
}

export async function getUserFromRequest(request: Request, repository?: AuthRepository): Promise<AuthUser | null> {
  if (!sessionTokenFromRequest(request)) return null;
  return userFromRequest(request, repository ?? getPrisma());
}

export async function requireRole(request: Request, allowed: readonly UserRole[], repository?: AuthRepository) {
  const user = await getUserFromRequest(request, repository);
  if (!user) return { user: null, status: 401 as const };
  if (!roleAllowed(user, allowed)) return { user, status: 403 as const };
  return { user, status: 200 as const };
}
