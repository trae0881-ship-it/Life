import { createHash, randomBytes } from "node:crypto";
import { AuthInputError, hashPassword, normalizeEmail, validatePassword } from "./auth-core.ts";

export const PASSWORD_RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type ResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type PasswordRecoveryRepository = {
  findUserByEmail(email: string): Promise<{ id: string; email: string } | null>;
  replaceResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findResetToken(tokenHash: string): Promise<ResetTokenRecord | null>;
  completePasswordReset(input: { tokenId: string; userId: string; passwordHash: string; now: Date }): Promise<boolean>;
  deleteResetToken(tokenHash: string): Promise<void>;
};

export async function createPasswordReset(
  value: unknown,
  repository: Pick<PasswordRecoveryRepository, "findUserByEmail" | "replaceResetToken">,
  now = new Date(),
) {
  let email: string;
  try {
    email = normalizeEmail(value);
  } catch (error) {
    if (error instanceof AuthInputError) return null;
    throw error;
  }

  const user = await repository.findUserByEmail(email);
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_LIFETIME_MS);
  await repository.replaceResetToken(user.id, hashResetToken(token), expiresAt);
  return { email: user.email, token, expiresAt };
}

export async function consumePasswordReset(
  input: { token: unknown; password: unknown; confirmPassword: unknown },
  repository: Pick<PasswordRecoveryRepository, "findResetToken" | "completePasswordReset">,
  now = new Date(),
) {
  validatePassword(input.password);
  if (typeof input.confirmPassword !== "string" || input.confirmPassword !== input.password) {
    throw new AuthInputError("Password confirmation does not match.", "PASSWORD_CONFIRMATION_MISMATCH");
  }
  if (typeof input.token !== "string" || !TOKEN_PATTERN.test(input.token)) return false;

  const tokenHash = hashResetToken(input.token);
  const record = await repository.findResetToken(tokenHash);
  if (!record || record.usedAt || record.expiresAt <= now) return false;

  const passwordHash = await hashPassword(input.password);
  return repository.completePasswordReset({
    tokenId: record.id,
    userId: record.userId,
    passwordHash,
    now,
  });
}

export function passwordResetTokenHash(token: string) {
  return hashResetToken(token);
}
