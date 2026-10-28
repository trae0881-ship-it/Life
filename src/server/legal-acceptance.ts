import { getPrisma } from "./db";
import { CURRENT_TERMS_VERSION } from "@/legal/terms";

export async function hasCurrentTermsAcceptance(userId: string) {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { termsVersion: true, termsAcceptedAt: true },
  });
  return user?.termsVersion === CURRENT_TERMS_VERSION && user.termsAcceptedAt !== null;
}
