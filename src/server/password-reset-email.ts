const RESEND_API_URL = "https://api.resend.com/emails";

export type PasswordResetEmailConfig = {
  apiKey: string;
  from: string;
  appOrigin: string;
};

export function readPasswordResetEmailConfig(
  environment: NodeJS.ProcessEnv = process.env,
): PasswordResetEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.LIFE_EMAIL_FROM?.trim();
  const appUrl = environment.LIFE_PUBLIC_APP_URL?.trim();
  if (!apiKey || !from || !appUrl) return null;

  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol)
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
    || (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    || (environment.NODE_ENV === "production" && (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  ) return null;

  return { apiKey, from, appOrigin: url.origin };
}

export async function sendPasswordResetEmail(
  input: { to: string; token: string; config: PasswordResetEmailConfig },
  fetcher: typeof fetch = fetch,
) {
  const resetUrl = new URL("/reset-password", input.config.appOrigin);
  resetUrl.hash = new URLSearchParams({ token: input.token }).toString();
  const link = resetUrl.toString();
  const response = await fetcher(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.config.from,
      to: [input.to],
      subject: "Reset your LIFE password",
      text: `A password reset was requested for your LIFE account. This link expires in 30 minutes and can be used once:\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>A password reset was requested for your LIFE account.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PasswordResetDeliveryError(response.status);
  }
}

export class PasswordResetDeliveryError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("Password reset email provider rejected the request.");
    this.name = "PasswordResetDeliveryError";
    this.status = status;
  }
}
