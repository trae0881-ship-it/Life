import { safeReturnTo } from "./auth-redirect.ts";

export const DEFAULT_DEVELOPER_RETURN_TO = "/developers/dashboard";
export const DEFAULT_DEVELOPER_SIGNUP_RETURN_TO = "/developers?access=approval-required";

export function safeDeveloperReturnTo(value: string | null | undefined) {
  const destination = safeReturnTo(value, DEFAULT_DEVELOPER_RETURN_TO);
  try {
    const pathname = new URL(destination, "https://life.invalid").pathname;
    if (pathname === "/developer/login" || pathname === "/developer/signup") return DEFAULT_DEVELOPER_RETURN_TO;
  } catch {
    return DEFAULT_DEVELOPER_RETURN_TO;
  }
  return destination;
}

export function safeDeveloperSignupReturnTo(value: string | null | undefined) {
  const destination = safeReturnTo(value, DEFAULT_DEVELOPER_SIGNUP_RETURN_TO);
  try {
    const pathname = new URL(destination, "https://life.invalid").pathname;
    if (pathname === "/developer/login" || pathname === "/developer/signup"
      || pathname === "/developers/dashboard" || pathname.startsWith("/developers/dashboard/")) {
      return DEFAULT_DEVELOPER_SIGNUP_RETURN_TO;
    }
  } catch {
    return DEFAULT_DEVELOPER_SIGNUP_RETURN_TO;
  }
  return destination;
}
