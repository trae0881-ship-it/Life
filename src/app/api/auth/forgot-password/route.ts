import { createHash } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { AuthInputError, normalizeEmail } from "@/server/auth-core";
import { createPasswordReset, passwordResetTokenHash } from "@/server/password-recovery";
import { readPasswordResetEmailConfig, sendPasswordResetEmail } from "@/server/password-reset-email";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_RESPONSE = {
  message: "If the address matches an account and delivery succeeds, password reset instructions will arrive shortly.",
};

async function processResetRequest(email: string, emailConfig: NonNullable<ReturnType<typeof readPasswordResetEmailConfig>>) {
  let prisma: ReturnType<typeof getPrisma>;
  let reset: Awaited<ReturnType<typeof createPasswordReset>>;
  try {
    prisma = getPrisma();
    reset = await createPasswordReset(email, {
      findUserByEmail(value) {
        return prisma.user.findUnique({ where: { email: value }, select: { id: true, email: true } });
      },
      replaceResetToken(userId, tokenHash, expiresAt) {
        return prisma.$transaction(async (transaction) => {
          await transaction.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
          await transaction.passwordResetToken.create({
            data: { userId, tokenHash, expiresAt },
            select: { id: true },
          });
        });
      },
    });
  } catch (error) {
    console.error("Password reset request persistence failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return;
  }

  if (!reset) return;
  try {
    await sendPasswordResetEmail({ to: reset.email, token: reset.token, config: emailConfig });
  } catch (error) {
    const providerStatus = error && typeof error === "object" && "status" in error
      && typeof error.status === "number" ? error.status : null;
    console.error("Password reset email delivery failed.", { providerStatus });
    try {
      await prisma.passwordResetToken.deleteMany({
        where: { tokenHash: passwordResetTokenHash(reset.token) },
      });
    } catch (cleanupError) {
      console.error("Password reset token cleanup failed after delivery failure.", {
        errorType: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
      });
    }
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const ipLimit = checkRateLimit(`password-reset-ip:${requestRateLimitKey(request)}`, 5, 15 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const emailConfig = readPasswordResetEmailConfig();
  if (!emailConfig) {
    return jsonError("Password recovery is temporarily unavailable.", 503, "RECOVERY_UNAVAILABLE");
  }

  try {
    const body = await readJson(request);
    if (!body) return jsonError("Enter the email address for your account.", 422, "INVALID_INPUT");

    let normalizedEmail: string;
    try {
      normalizedEmail = normalizeEmail(body.email);
    } catch (error) {
      if (error instanceof AuthInputError) {
        return NextResponse.json(GENERIC_RESPONSE, { status: 202, headers: { "Cache-Control": "no-store" } });
      }
      throw error;
    }

    const emailKey = createHash("sha256").update(normalizedEmail).digest("hex");
    const emailLimit = checkRateLimit(`password-reset-email:${emailKey}`, 3, 60 * 60_000);
    if (emailLimit.allowed) {
      after(() => processResetRequest(normalizedEmail, emailConfig));
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    }
    console.error("Password reset request scheduling failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Password recovery is temporarily unavailable.", 503, "RECOVERY_UNAVAILABLE");
  }
}
