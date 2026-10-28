export function trustProxyHeaders() {
  return process.env.LIFE_TRUST_PROXY_HEADERS === "true";
}
