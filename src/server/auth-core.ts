import argon2 from "argon2";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";

export const SESSION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
export const AUTH_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-life_session" : "life_session";
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export type UserRole = "USER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN";
export type AuthUser = { id: string; email: string; role: UserRole };
export type AuthRepository = Pick<PrismaClient, "user" | "session">;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
let dummyPasswordHash: Promise<string> | undefined;

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") throw new AuthInputError();
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) throw new AuthInputError();
  return email;
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || value.trim() !== value) {
    throw new AuthInputError("Use a password between 12 and 128 characters without leading or trailing spaces.");
  }
  return value;
}

export function validateFullName(value: unknown) {
  if (typeof value !== "string") throw new AuthInputError("Enter your full name.", "FULL_NAME_INVALID");
  const fullName = value.trim();
  if (!fullName || fullName.length > 100 || /[\u0000-\u001f\u007f]/.test(fullName)) {
    throw new AuthInputError("Enter your full name using up to 100 characters.", "FULL_NAME_INVALID");
  }
  return fullName;
}

export class AuthInputError extends Error {
  readonly code: string;

  constructor(message = "Enter a valid email address and password.", code = "INVALID_INPUT") {
    super(message);
    this.name = "AuthInputError";
    this.code = code;
  }
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function registerAccount(
  input: { fullName: unknown; email: unknown; password: unknown; confirmPassword: unknown; termsVersion: unknown; acceptedTerms: unknown },
  repository: AuthRepository,
) {
  if (input.acceptedTerms !== true || typeof input.termsVersion !== "string" || !input.termsVersion) {
    throw new AuthInputError("Accept the current Terms & Conditions to create an account.");
  }
  const fullName = validateFullName(input.fullName);
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  if (typeof input.confirmPassword !== "string" || input.confirmPassword !== password) {
    throw new AuthInputError("Password confirmation does not match.", "PASSWORD_CONFIRMATION_MISMATCH");
  }
  const passwordHash = await hashPassword(password);
  return repository.user.create({
    data: { fullName, email, passwordHash, role: "USER", termsVersion: input.termsVersion, termsAcceptedAt: new Date() },
    select: { id: true, email: true, role: true },
  }) as Promise<AuthUser>;
}

export async function authenticateCredentials(
  input: { email: unknown; password: unknown },
  repository: AuthRepository,
): Promise<AuthUser | null> {
  let email: string;
  try {
    email = normalizeEmail(input.email);
    validatePassword(input.password);
  } catch {
    return null;
  }
  if (typeof input.password !== "string") return null;
  const user = await repository.user.findUnique({ where: { email } });
  if (!user || typeof user.passwordHash !== "string") {
    dummyPasswordHash ??= hashPassword("non-user-authentication-timing-value");
    await verifyPassword(await dummyPasswordHash, input.password);
    return null;
  }
  if (!(await verifyPassword(user.passwordHash, input.password))) return null;
  return { id: user.id, email: user.email, role: user.role };
}

export async function createSession(userId: string, repository: AuthRepository, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  await repository.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
    select: { id: true },
  });
  return { token, expiresAt };
}

export async function findSession(token: string | undefined, repository: AuthRepository, now = new Date()) {
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const session = await repository.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: now } },
    select: { expiresAt: true, user: { select: { id: true, email: true, role: true } } },
  });
  if (!session?.user || !["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) return null;
  return { user: session.user as AuthUser, expiresAt: session.expiresAt as Date };
}

export async function revokeSession(token: string | undefined, repository: AuthRepository) {
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return 0;
  const result = await repository.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  return result.count;
}

export function constantTimeSecretMatch(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function roleAllowed(user: AuthUser | null, allowed: readonly UserRole[]) {
  return user !== null && allowed.includes(user.role);
}

export async function getUserFromRequest(request: Request, repository: AuthRepository): Promise<AuthUser | null> {
  const token = sessionTokenFromRequest(request);
  return (await findSession(token, repository))?.user ?? null;
}

export function sessionTokenFromRequest(request: Request) {
  const token = request.headers.get("cookie")?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_-]{40,50}$/.test(token) ? token : undefined;
}

export async function requireRole(request: Request, allowed: readonly UserRole[], repository: AuthRepository) {
  const user = await getUserFromRequest(request, repository);
  if (!user) return { user: null, status: 401 as const };
  if (!roleAllowed(user, allowed)) return { user, status: 403 as const };
  return { user, status: 200 as const };
}
