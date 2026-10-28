import { NextRequest } from "next/server";
import { AuthInputError } from "@/server/auth-core";
import { consumePasswordReset } from "@/server/password-recovery";
import { getPrisma } from "@/server/db";
import { isSameOriginMutation, jsonError, readJson, RequestBodyError } from "@/server/http";
import { checkRateLimit, requestRateLimitKey } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Request origin is not allowed.", 403, "INVALID_ORIGIN");
  const limit = checkRateLimit(`password-reset-complete:${requestRateLimitKey(request)}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    return jsonError("Too many attempts. Request a new reset link and try again later.", 429, "RATE_LIMITED");
  }

  try {
    const body = await readJson(request);
    if (!body) return jsonError("Reset details are required.", 422, "INVALID_INPUT");
    const prisma = getPrisma();
    const completed = await consumePasswordReset(
      { token: body.token, password: body.password, confirmPassword: body.confirmPassword },
      {
        findResetToken(tokenHash) {
          return prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            select: { id: true, userId: true, expiresAt: true, usedAt: true },
          });
        },
        completePasswordReset({ tokenId, userId, passwordHash, now }) {
          return prisma.$transaction(async (transaction) => {
            const claimed = await transaction.passwordResetToken.updateMany({
              where: { id: tokenId, userId, usedAt: null, expiresAt: { gt: now } },
              data: { usedAt: now },
            });
            if (claimed.count !== 1) return false;

            await transaction.user.update({
              where: { id: userId },
              data: { passwordHash },
              select: { id: true },
            });
            await transaction.session.deleteMany({ where: { userId } });
            await transaction.passwordResetToken.deleteMany({ where: { userId } });
            return true;
          });
        },
      },
    );

    if (!completed) return jsonError("This reset link is invalid or expired. Request a new one.", 400, "RESET_TOKEN_INVALID");
    return Response.json({ message: "Password updated. Sign in with your new password." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthInputError) return jsonError(error.message, 422, error.code);
    if (error instanceof RequestBodyError) {
      return jsonError(error.message, error.status, error.status === 400 ? "INVALID_JSON" : "PAYLOAD_TOO_LARGE");
    }
    console.error("Password reset completion failed.");
    return jsonError("Password recovery is temporarily unavailable.", 503, "RECOVERY_UNAVAILABLE");
  }
}
