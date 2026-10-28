import { trustProxyHeaders } from "./proxy-trust.ts";

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const useForwardedHeaders = trustProxyHeaders();
    const forwardedHost = useForwardedHeaders ? request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() : undefined;
    const requestHost = forwardedHost || request.headers.get("host") || requestUrl.host;
    const forwardedProtocol = useForwardedHeaders ? request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() : undefined;
    const requestProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
    return ["http:", "https:"].includes(originUrl.protocol) &&
      originUrl.host.toLowerCase() === requestHost.toLowerCase() &&
      originUrl.protocol === `${requestProtocol.toLowerCase()}:`;
  } catch {
    return false;
  }
}
