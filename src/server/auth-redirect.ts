const DEFAULT_RETURN_TO = "/dashboard";

export function safeReturnTo(value: string | null | undefined, fallback = DEFAULT_RETURN_TO) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(decoded)) return fallback;
    const parsed = new URL(value, "https://life.invalid");
    if (parsed.origin !== "https://life.invalid") return fallback;
    if (["/login", "/signup", "/developer/login", "/developer/signup"].includes(parsed.pathname)) return fallback;
  } catch {
    return fallback;
  }
  return value;
}
