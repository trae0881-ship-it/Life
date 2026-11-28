const approvedExternalHosts = new Set([
  "archive.org",
  "datacenter.iers.org",
  "download.geonames.org",
  "github.com",
  "raw.githubusercontent.com",
  "saravali.github.io",
  "ssd-api.jpl.nasa.gov",
  "ssd.jpl.nasa.gov",
  "www.astro.com",
  "www.iana.org",
  "www.lakshminarayanlenasia.com",
]);

export function getApprovedExternalHref(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value || value.trim() !== value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !approvedExternalHosts.has(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
