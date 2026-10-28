import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

export const SEO_PAGE_DEFINITIONS = [
  {
    path: "/",
    title: "LIFE — Vedic Astrology & Jyotish Workbench",
    description: "Explore a Vedic birth chart with local astronomical calculations, documented Jyotish conventions, divisional charts and inspectable results.",
  },
  {
    path: "/references",
    title: "References & Sources | LIFE",
    description: "Sources used by LIFE's calculation engine, datasets and documented Jyotish conventions, with verification scope and limitations.",
  },
  {
    path: "/blogs",
    title: "LIFE Journal | Jyotish Articles",
    description: "Published articles from the LIFE Jyotish workbench. Editorial content is informational and does not promise future outcomes.",
  },
  {
    path: "/disclaimer",
    title: "Disclaimer | LIFE",
    description: "Read LIFE's educational, calculation and astrology limitations before using the Jyotish workbench.",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms & Conditions | LIFE",
    description: "Review the terms that apply to LIFE accounts, chart tools and related services.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | LIFE",
    description: "Learn how LIFE handles account information, birth details, saved charts and privacy requests.",
  },
  {
    path: "/refund-policy",
    title: "Refund Policy | LIFE",
    description: "Review LIFE's refund policy and payment information.",
  },
] as const;

export type SeoPagePath = string;
export type SeoPageSettings = {
  path: SeoPagePath;
  title: string;
  description: string;
  canonicalPath: SeoPagePath;
  robots: { index: boolean; follow: boolean };
  openGraph: { title: string; description: string };
};

export type SeoPageAudit = {
  path: SeoPagePath;
  status: number | null;
  titlePresent: boolean;
  titleLength?: number | null;
  descriptionPresent: boolean;
  descriptionLength?: number | null;
  canonicalPresent: boolean;
  robotsIndex?: boolean | null;
  robotsFollow?: boolean | null;
  openGraphTitlePresent?: boolean;
  openGraphDescriptionPresent?: boolean;
  imageCount?: number | null;
  imagesMissingAlt?: number | null;
  h1Count: number | null;
  headingLevels?: number[] | null;
  internalLinkCount: number | null;
  brokenInternalLinks: number | null;
  sitemapIncluded?: boolean | null;
  validJsonLdBlocks: number | null;
  invalidJsonLdBlocks: number | null;
  issues?: { severity: "high" | "medium" | "low"; code: string; message: string; suggestion: string }[];
};

export type SeoAuditRecord = {
  id: string;
  completedAt: string;
  pagesAudited: number;
  metrics: {
    missingTitles: number;
    missingDescriptions: number;
    duplicateTitles: number;
    duplicateDescriptions: number;
    missingCanonicals: number;
    titleOutOfRange?: number;
    descriptionOutOfRange?: number;
    missingOpenGraph?: number;
    imagesMissingAlt?: number;
    missingH1: number;
    brokenInternalLinks: number;
    validJsonLdBlocks: number;
    invalidJsonLdBlocks: number;
  };
  sitemap: { status: number | null; valid: boolean; listedPages: number };
  robots: { status: number | null; valid: boolean; blockedPublicPaths: string[] };
  pages: SeoPageAudit[];
  readinessLabel?: "internal_heuristic_not_google_ranking";
};

type SeoStore = {
  version: 1;
  settings: Partial<Record<SeoPagePath, SeoPageSettings>>;
  audits: SeoAuditRecord[];
};

const DEFAULT_STORE_PATH = path.join(process.cwd(), "data", "seo-management.json");
const MAX_AUDIT_HISTORY = 20;
let storeWriteQueue = Promise.resolve();

const emptyStore = (): SeoStore => ({ version: 1, settings: {}, audits: [] });

function withSeoStoreWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = storeWriteQueue.then(operation, operation);
  storeWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pageDefinition(value: unknown) {
  return SEO_PAGE_DEFINITIONS.find((page) => page.path === value);
}

function isAuditablePath(value: unknown): value is string {
  return Boolean(pageDefinition(value))
    || (typeof value === "string" && /^\/blogs\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isHttpStatus(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599);
}

function validateSeoAuditRecord(value: unknown): SeoAuditRecord | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id || value.id.length > 100) return null;
  if (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
  if (!isCount(value.pagesAudited) || value.pagesAudited > SEO_PAGE_DEFINITIONS.length || !Array.isArray(value.pages) || value.pages.length !== value.pagesAudited) return null;
  if (!isObject(value.metrics) || !isObject(value.sitemap) || !isObject(value.robots)) return null;
  const metrics = value.metrics;

  const metricNames = [
    "missingTitles",
    "missingDescriptions",
    "duplicateTitles",
    "duplicateDescriptions",
    "missingCanonicals",
    "titleOutOfRange",
    "descriptionOutOfRange",
    "missingOpenGraph",
    "imagesMissingAlt",
    "missingH1",
    "brokenInternalLinks",
    "validJsonLdBlocks",
    "invalidJsonLdBlocks",
  ] as const;
  if (!metricNames.every((name) => metrics[name] === undefined || isCount(metrics[name]))) return null;

  const sitemap = value.sitemap;
  if (!isHttpStatus(sitemap.status) || typeof sitemap.valid !== "boolean" || !isCount(sitemap.listedPages)) return null;
  const robots = value.robots;
  if (!isHttpStatus(robots.status) || typeof robots.valid !== "boolean" || !Array.isArray(robots.blockedPublicPaths)) return null;
  if (!robots.blockedPublicPaths.every((route) => isAuditablePath(route))) return null;

  const seenPaths = new Set<string>();
  const pages: SeoPageAudit[] = [];
  for (const page of value.pages) {
    if (!isObject(page) || !isAuditablePath(page.path) || seenPaths.has(page.path as string)) return null;
    if (!isHttpStatus(page.status)) return null;
    if (!["titlePresent", "descriptionPresent", "canonicalPresent"].every((key) => typeof page[key] === "boolean")) return null;
    if (![page.h1Count, page.internalLinkCount, page.brokenInternalLinks, page.validJsonLdBlocks, page.invalidJsonLdBlocks]
      .every((count) => count === null || isCount(count))) return null;
    if (["titleLength", "descriptionLength", "imageCount", "imagesMissingAlt"].some((key) => page[key] !== undefined && page[key] !== null && !isCount(page[key]))) return null;
    if (["robotsIndex", "robotsFollow", "openGraphTitlePresent", "openGraphDescriptionPresent", "sitemapIncluded"]
      .some((key) => page[key] !== undefined && page[key] !== null && typeof page[key] !== "boolean")) return null;
    if (page.headingLevels !== undefined && page.headingLevels !== null
      && (!Array.isArray(page.headingLevels) || !page.headingLevels.every((level) => Number.isInteger(level) && level >= 1 && level <= 6))) return null;
    if (page.issues !== undefined && (!Array.isArray(page.issues) || !page.issues.every((issue) =>
      isObject(issue)
      && ["high", "medium", "low"].includes(issue.severity as string)
      && typeof issue.code === "string"
      && typeof issue.message === "string"
      && typeof issue.suggestion === "string"))) return null;
    seenPaths.add(page.path as string);
    pages.push({
      path: page.path as SeoPagePath,
      status: page.status,
      titlePresent: page.titlePresent as boolean,
      titleLength: page.titleLength === undefined ? null : page.titleLength as number | null,
      descriptionPresent: page.descriptionPresent as boolean,
      descriptionLength: page.descriptionLength === undefined ? null : page.descriptionLength as number | null,
      canonicalPresent: page.canonicalPresent as boolean,
      robotsIndex: page.robotsIndex === undefined ? null : page.robotsIndex as boolean | null,
      robotsFollow: page.robotsFollow === undefined ? null : page.robotsFollow as boolean | null,
      openGraphTitlePresent: page.openGraphTitlePresent === true,
      openGraphDescriptionPresent: page.openGraphDescriptionPresent === true,
      imageCount: page.imageCount === undefined ? null : page.imageCount as number | null,
      imagesMissingAlt: page.imagesMissingAlt === undefined ? null : page.imagesMissingAlt as number | null,
      h1Count: page.h1Count as number | null,
      headingLevels: Array.isArray(page.headingLevels) ? page.headingLevels as number[] : null,
      internalLinkCount: page.internalLinkCount as number | null,
      brokenInternalLinks: page.brokenInternalLinks as number | null,
      sitemapIncluded: page.sitemapIncluded === undefined ? null : page.sitemapIncluded as boolean | null,
      validJsonLdBlocks: page.validJsonLdBlocks as number | null,
      invalidJsonLdBlocks: page.invalidJsonLdBlocks as number | null,
      issues: Array.isArray(page.issues) ? page.issues as SeoPageAudit["issues"] : [],
    });
  }

  return {
    id: value.id,
    completedAt: value.completedAt,
    pagesAudited: value.pagesAudited,
    metrics: Object.fromEntries(metricNames.map((name) => [name, metrics[name] ?? 0])) as SeoAuditRecord["metrics"],
    sitemap: { status: sitemap.status, valid: sitemap.valid, listedPages: sitemap.listedPages },
    robots: { status: robots.status, valid: robots.valid, blockedPublicPaths: [...robots.blockedPublicPaths] as string[] },
    pages,
    ...(value.readinessLabel === "internal_heuristic_not_google_ranking" ? { readinessLabel: value.readinessLabel } : {}),
  };
}

export function defaultSeoSettings(pagePath: SeoPagePath): SeoPageSettings {
  const page = pageDefinition(pagePath);
  if (!page) throw new Error("Unknown managed SEO route.");
  return {
    path: page.path,
    title: page.title,
    description: page.description,
    canonicalPath: page.path,
    robots: { index: true, follow: true },
    openGraph: { title: page.title, description: page.description },
  };
}

export function validateSeoPageSettings(value: unknown): SeoPageSettings | null {
  if (!isObject(value) || !pageDefinition(value.path)) return null;
  if (
    typeof value.title !== "string"
    || value.title.trim().length < 1
    || value.title.trim().length > 70
    || typeof value.description !== "string"
    || value.description.trim().length < 1
    || value.description.trim().length > 160
    || !pageDefinition(value.canonicalPath)
    || !isObject(value.robots)
    || typeof value.robots.index !== "boolean"
    || typeof value.robots.follow !== "boolean"
    || !isObject(value.openGraph)
    || typeof value.openGraph.title !== "string"
    || value.openGraph.title.trim().length < 1
    || value.openGraph.title.trim().length > 70
    || typeof value.openGraph.description !== "string"
    || value.openGraph.description.trim().length < 1
    || value.openGraph.description.trim().length > 160
  ) return null;

  return {
    path: value.path as SeoPagePath,
    title: value.title.trim(),
    description: value.description.trim(),
    canonicalPath: value.canonicalPath as SeoPagePath,
    robots: { index: value.robots.index, follow: value.robots.follow },
    openGraph: {
      title: value.openGraph.title.trim(),
      description: value.openGraph.description.trim(),
    },
  };
}

export async function readSeoStore(storePath = DEFAULT_STORE_PATH): Promise<SeoStore> {
  try {
    const contents = await readFile(/*turbopackIgnore: true*/ storePath, "utf8");
    const parsed: unknown = JSON.parse(contents);
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.settings) || !Array.isArray(parsed.audits)) {
      throw new Error("SEO management storage has an invalid format.");
    }
    const settings: SeoStore["settings"] = {};
    for (const [key, entry] of Object.entries(parsed.settings)) {
      if (!pageDefinition(key)) throw new Error("SEO management storage contains an unknown route.");
      const validated = validateSeoPageSettings(entry);
      if (!validated || validated.path !== key) throw new Error("SEO management storage contains invalid metadata.");
      settings[key] = validated;
    }
    const audits = parsed.audits.map(validateSeoAuditRecord);
    if (audits.some((audit) => audit === null)) throw new Error("SEO management storage contains invalid audit history.");
    return { version: 1, settings, audits: audits as SeoAuditRecord[] };
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function writeSeoStore(store: SeoStore, storePath: string) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporaryPath, storePath);
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function saveSeoPageSettings(value: unknown, storePath = DEFAULT_STORE_PATH) {
  const settings = validateSeoPageSettings(value);
  if (!settings) return null;
  return withSeoStoreWriteLock(async () => {
    const store = await readSeoStore(storePath);
    store.settings[settings.path] = settings;
    await writeSeoStore(store, storePath);
    return settings;
  });
}

export async function getSeoDashboardData(storePath = DEFAULT_STORE_PATH) {
  const store = await readSeoStore(storePath);
  const pages = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => store.settings[pagePath] ?? defaultSeoSettings(pagePath));
  return {
    pages,
    audits: store.audits,
    lastAudit: store.audits[0] ?? null,
    persistence: {
      type: "local_json_file" as const,
      durableInProduction: false as const,
      note: "Local JSON storage is intended for development only; deployment persistence is not configured.",
    },
    indexedPages: null,
    indexedPagesSource: "unavailable",
    searchConsole: { configured: false, status: "not_configured" as const },
    sitemap: {
      status: getPublicSiteOrigin() ? "configured" as const : "base_url_missing" as const,
      pageCount: pages.filter((page) => page.robots.index && page.canonicalPath === page.path).length,
    },
    robots: { status: "generated_from_safe_defaults" as const },
  };
}

export function getPublicSiteOrigin(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.LIFE_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      !["http:", "https:"].includes(url.protocol)
      || (url.protocol !== "https:" && !localHost)
      || (environment.NODE_ENV === "production" && (url.protocol !== "https:" || localHost))
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function metadataForManagedPage(pagePath: SeoPagePath, storePath = DEFAULT_STORE_PATH): Promise<Metadata> {
  const definition = pageDefinition(pagePath);
  if (!definition) throw new Error("Unknown managed SEO route.");
  const store = await readSeoStore(storePath);
  const settings = store.settings[pagePath] ?? defaultSeoSettings(pagePath);
  const origin = getPublicSiteOrigin();
  return {
    title: settings.title,
    description: settings.description,
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    alternates: { canonical: settings.canonicalPath },
    robots: { index: settings.robots.index, follow: settings.robots.follow },
    openGraph: {
      type: "website",
      title: settings.openGraph.title,
      description: settings.openGraph.description,
      ...(origin ? { url: new URL(settings.canonicalPath, origin) } : {}),
    },
    twitter: {
      card: "summary",
      title: settings.openGraph.title,
      description: settings.openGraph.description,
    },
  };
}

export function createSitemapEntries(origin: string | null, settings: SeoPageSettings[]): { url: string }[] {
  if (!origin) return [];
  return settings
    .filter((page) => page.robots.index && page.canonicalPath === page.path)
    .map((page) => ({ url: new URL(page.path, origin).toString() }));
}

export function createRobotsMetadata(origin: string | null) {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/dashboard/", "/super-admin/"] },
    ],
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).toString() } : {}),
  };
}

function localApplicationOrigin() {
  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The local application port is invalid.");
  return `http://127.0.0.1:${port}`;
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
  }
  return attributes;
}

function htmlMeta(html: string, selector: (attributes: Record<string, string>) => boolean) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    if (selector(attributes)) return attributes.content?.trim() ?? "";
  }
  return "";
}

function safeBody(html: string) {
  return html.slice(0, 1_000_000);
}

async function readBoundedBody(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new Error("Audited page exceeded the response size limit.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function duplicateCount(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.values()].reduce((duplicates, count) => duplicates + Math.max(0, count - 1), 0);
}

function robotsRuleMatches(pathname: string, rule: string) {
  const anchoredAtEnd = rule.endsWith("$");
  const pattern = anchoredAtEnd ? rule.slice(0, -1) : rule;
  const parts = pattern.split("*");
  let position = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;
    const foundAt = pathname.indexOf(part, position);
    if (foundAt < 0 || (index === 0 && !pattern.startsWith("*") && foundAt !== 0)) return false;
    position = foundAt + part.length;
    if (anchoredAtEnd && index === parts.length - 1 && position !== pathname.length) return false;
  }
  return true;
}

function validateRobotsBody(body: string, publicPaths: string[]) {
  const disallowed = [...body.matchAll(/^\s*Disallow:\s*(\/\S*)\s*$/gim)].map((match) => match[1]);
  return publicPaths.filter((publicPath) => disallowed.some((rule) => robotsRuleMatches(publicPath, rule)));
}

export async function runSeoAudit(options: {
  storePath?: string;
  fetcher?: typeof fetch;
  localOrigin?: string;
  additionalPages?: SeoPageSettings[];
} = {}) {
  const storePath = options.storePath ?? DEFAULT_STORE_PATH;
  const fetcher = options.fetcher ?? fetch;
  const origin = options.localOrigin ?? localApplicationOrigin();
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "http:" || parsedOrigin.hostname !== "127.0.0.1") {
    throw new Error("SEO audit origin must be the local application loopback address.");
  }

  const store = await readSeoStore(storePath);
  const staticSettings = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => store.settings[pagePath] ?? defaultSeoSettings(pagePath));
  const additionalSettings = (options.additionalPages ?? []).filter((page) =>
    isAuditablePath(page.path)
    && page.path.startsWith("/blogs/")
    && isAuditablePath(page.canonicalPath)
    && page.title.trim().length > 0
    && page.description.trim().length > 0
    && typeof page.robots.index === "boolean"
    && typeof page.robots.follow === "boolean");
  const settings = [...staticSettings, ...additionalSettings].filter((page) => page.robots.index);
  const auditedPaths = new Set(settings.map((page) => page.path));
  const fetched = new Map<string, { status: number; html: string }>();
  const pageResults: SeoPageAudit[] = [];
  for (const settingsForPage of settings) {
    const url = new URL(settingsForPage.path, parsedOrigin);
    const response = await fetcher(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const html = response.ok ? safeBody(await readBoundedBody(response)) : "";
    fetched.set(settingsForPage.path, { status: response.status, html });
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    const description = htmlMeta(html, (attributes) => attributes.name?.toLowerCase() === "description");
    const ogTitle = htmlMeta(html, (attributes) => attributes.property?.toLowerCase() === "og:title");
    const ogDescription = htmlMeta(html, (attributes) => attributes.property?.toLowerCase() === "og:description");
    const robots = htmlMeta(html, (attributes) => attributes.name?.toLowerCase() === "robots").toLowerCase().split(/[\s,]+/);
    const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
    const imagesMissingAlt = imageTags.filter((match) => !("alt" in parseAttributes(match[0]))).length;
    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    const canonicalPresent = [...head.matchAll(/<link\b[^>]*>/gi)].some((match) => {
      const attributes = parseAttributes(match[0]);
      if (!attributes.rel?.toLowerCase().split(/\s+/).includes("canonical") || !attributes.href) return false;
      try {
        const canonical = new URL(attributes.href, url);
        const publicOrigin = getPublicSiteOrigin();
        return canonical.origin === parsedOrigin.origin || Boolean(publicOrigin && canonical.origin === publicOrigin);
      } catch {
        return false;
      }
    });
    const jsonLd = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .filter((match) => parseAttributes(match[0].slice(0, match[0].indexOf(">") + 1)).type?.toLowerCase() === "application/ld+json");
    let validJsonLdBlocks = 0;
    let invalidJsonLdBlocks = 0;
    for (const block of jsonLd) {
      try {
        JSON.parse(block[1]);
        validJsonLdBlocks += 1;
      } catch {
        invalidJsonLdBlocks += 1;
      }
    }
    const anchors = [...html.matchAll(/<a\b[^>]*>/gi)];
    const internalLinks = anchors.filter((anchor) => {
      const href = parseAttributes(anchor[0]).href;
      if (!href) return false;
      try {
        const target = new URL(href, url);
        return target.origin === parsedOrigin.origin && auditedPaths.has(target.pathname as SeoPagePath);
      } catch {
        return false;
      }
    });
    const h1Count = [...html.matchAll(/<h1\b/gi)].length;
    pageResults.push({
      path: settingsForPage.path,
      status: response.status,
      titlePresent: Boolean(title),
      titleLength: title.length,
      descriptionPresent: Boolean(description),
      descriptionLength: description.length,
      canonicalPresent,
      robotsIndex: !robots.includes("noindex"),
      robotsFollow: !robots.includes("nofollow"),
      openGraphTitlePresent: Boolean(ogTitle),
      openGraphDescriptionPresent: Boolean(ogDescription),
      imageCount: imageTags.length,
      imagesMissingAlt,
      h1Count: headingLevels.filter((level) => level === 1).length,
      headingLevels,
      internalLinkCount: internalLinks.length,
      brokenInternalLinks: 0,
      sitemapIncluded: null,
      validJsonLdBlocks,
      invalidJsonLdBlocks,
      issues: [],
    });
  }

  for (const page of pageResults) {
    const source = fetched.get(page.path);
    if (!source || !source.html) continue;
    const pageUrl = new URL(page.path, parsedOrigin);
    let brokenInternalLinks = 0;
    for (const anchor of source.html.matchAll(/<a\b[^>]*>/gi)) {
      const href = parseAttributes(anchor[0]).href;
      if (!href) continue;
      let target: URL;
      try {
        target = new URL(href, pageUrl);
      } catch {
        continue;
      }
      if (target.origin !== parsedOrigin.origin || !auditedPaths.has(target.pathname)) continue;
      const targetResult = fetched.get(target.pathname);
      if (targetResult && targetResult.status >= 400) brokenInternalLinks += 1;
    }
    page.brokenInternalLinks = brokenInternalLinks;
  }

  const robotsResponse = await fetcher(new URL("/robots.txt", parsedOrigin), {
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const robotsBody = robotsResponse.ok ? await readBoundedBody(robotsResponse) : "";
  const blockedPublicPaths = validateRobotsBody(robotsBody, settings.map((page) => page.path));
  const robotsValid = robotsResponse.ok && /^User-Agent:/im.test(robotsBody) && blockedPublicPaths.length === 0;

  const sitemapResponse = await fetcher(new URL("/sitemap.xml", parsedOrigin), {
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const sitemapBody = sitemapResponse.ok ? await readBoundedBody(sitemapResponse) : "";
  const sitemapOrigin = getPublicSiteOrigin() ?? parsedOrigin.origin;
  const expectedSitemapPaths = new Set(settings.filter((page) => page.canonicalPath === page.path).map((page) => page.path));
  const sitemapLocations = [...sitemapBody.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => match[1].trim());
  const listedPaths = sitemapLocations
    .map((location) => {
      try {
        const url = new URL(location);
        return url.origin === sitemapOrigin && !url.search && !url.hash && expectedSitemapPaths.has(url.pathname)
          ? url.pathname
          : null;
      } catch {
        return null;
      }
    });
  const listedUniquePaths = new Set(listedPaths.filter((pagePath): pagePath is string => pagePath !== null));
  const listedPages = listedUniquePaths.size;
  const sitemapValid = sitemapResponse.ok
    && /<urlset\b/i.test(sitemapBody)
    && sitemapLocations.length === expectedSitemapPaths.size
    && listedPages === expectedSitemapPaths.size;
  const sitemapPaths = new Set(listedPaths.filter((pagePath): pagePath is string => pagePath !== null));
  for (const page of pageResults) {
    page.sitemapIncluded = sitemapPaths.has(page.path);
  }

  const titleByPath = new Map<string, string>();
  const descriptionByPath = new Map<string, string>();
  for (const [pagePath, result] of fetched) {
    const title = result.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    const description = htmlMeta(result.html, (attributes) => attributes.name?.toLowerCase() === "description");
    titleByPath.set(pagePath, title);
    descriptionByPath.set(pagePath, description);
  }

  const metrics = {
    missingTitles: pageResults.filter((page) => page.status === 200 && !page.titlePresent).length,
    missingDescriptions: pageResults.filter((page) => page.status === 200 && !page.descriptionPresent).length,
    titleOutOfRange: pageResults.filter((page) => page.status === 200 && page.titleLength !== null && ((page.titleLength ?? 0) < 30 || (page.titleLength ?? 0) > 70)).length,
    descriptionOutOfRange: pageResults.filter((page) => page.status === 200 && page.descriptionLength !== null && ((page.descriptionLength ?? 0) < 70 || (page.descriptionLength ?? 0) > 160)).length,
    missingOpenGraph: pageResults.filter((page) => page.status === 200 && (!page.openGraphTitlePresent || !page.openGraphDescriptionPresent)).length,
    imagesMissingAlt: pageResults.reduce((count, page) => count + (page.status === 200 ? page.imagesMissingAlt ?? 0 : 0), 0),
    duplicateTitles: duplicateCount(pageResults.filter((page) => page.status === 200).map((page) => titleByPath.get(page.path) ?? "")),
    duplicateDescriptions: duplicateCount(pageResults.filter((page) => page.status === 200).map((page) => descriptionByPath.get(page.path) ?? "")),
    missingCanonicals: pageResults.filter((page) => page.status === 200 && !page.canonicalPresent).length,
    missingH1: pageResults.filter((page) => page.status === 200 && page.h1Count === 0).length,
    brokenInternalLinks: pageResults.reduce((count, page) => count + (page.brokenInternalLinks ?? 0), 0),
    validJsonLdBlocks: pageResults.reduce((count, page) => count + (page.validJsonLdBlocks ?? 0), 0),
    invalidJsonLdBlocks: pageResults.reduce((count, page) => count + (page.invalidJsonLdBlocks ?? 0), 0),
  };
  for (const page of pageResults) {
    if (page.status !== 200) {
      page.issues?.push({ severity: "high", code: "HTTP_STATUS", message: `Page returned HTTP ${page.status}.`, suggestion: "Restore a successful public response before optimizing metadata." });
      continue;
    }
    if (!page.titlePresent) page.issues?.push({ severity: "high", code: "TITLE_MISSING", message: "Page title is missing.", suggestion: "Add a unique, accurate page title." });
    else if ((page.titleLength ?? 0) < 30 || (page.titleLength ?? 0) > 70) page.issues?.push({ severity: "medium", code: "TITLE_LENGTH", message: `Page title is ${page.titleLength} characters.`, suggestion: "Review the title for clarity and concise display; length is a heuristic, not a ranking rule." });
    if (!page.descriptionPresent) page.issues?.push({ severity: "medium", code: "DESCRIPTION_MISSING", message: "Meta description is missing.", suggestion: "Add a unique summary that accurately reflects the visible page." });
    else if ((page.descriptionLength ?? 0) < 70 || (page.descriptionLength ?? 0) > 160) page.issues?.push({ severity: "low", code: "DESCRIPTION_LENGTH", message: `Meta description is ${page.descriptionLength} characters.`, suggestion: "Review for concise, useful wording; length is a heuristic." });
    if (!page.canonicalPresent) page.issues?.push({ severity: "medium", code: "CANONICAL_MISSING", message: "A valid same-site canonical link was not found.", suggestion: "Set the canonical URL to the intended public version of this page." });
    if (page.robotsIndex === false) page.issues?.push({ severity: "high", code: "ROBOTS_NOINDEX", message: "Rendered robots metadata blocks indexing.", suggestion: "Remove noindex only if this public page should be discoverable." });
    if (!page.openGraphTitlePresent || !page.openGraphDescriptionPresent) page.issues?.push({ severity: "low", code: "OPEN_GRAPH_INCOMPLETE", message: "Open Graph title or description is missing.", suggestion: "Provide social-sharing metadata consistent with visible page content." });
    if ((page.imagesMissingAlt ?? 0) > 0) page.issues?.push({ severity: "medium", code: "IMAGE_ALT_MISSING", message: `${page.imagesMissingAlt} image(s) have no non-empty alt text.`, suggestion: "Add concise alt text for informative images; use empty alt text only for decorative images." });
    if (page.h1Count === 0 || page.h1Count !== 1) page.issues?.push({ severity: "low", code: "H1_STRUCTURE", message: `Page has ${page.h1Count} H1 headings.`, suggestion: "Review the page heading hierarchy and use a clear primary heading." });
    if (page.headingLevels?.some((level, index, levels) => index > 0 && level > levels[index - 1] + 1)) page.issues?.push({ severity: "low", code: "HEADING_HIERARCHY", message: "Heading levels skip one or more ranks.", suggestion: "Use headings in a logical hierarchy without skipping levels." });
    if (page.brokenInternalLinks && page.brokenInternalLinks > 0) page.issues?.push({ severity: "high", code: "BROKEN_INTERNAL_LINK", message: `${page.brokenInternalLinks} links to audited LIFE routes failed.`, suggestion: "Update internal links to working public routes." });
    if (page.sitemapIncluded === false) page.issues?.push({ severity: "low", code: "SITEMAP_OMISSION", message: "Page is not listed in the current sitemap.", suggestion: "Include it only if its canonical route is public and indexable." });
  }
  const audit: SeoAuditRecord = {
    id: randomUUID(),
    completedAt: new Date().toISOString(),
    pagesAudited: pageResults.length,
    metrics,
    sitemap: { status: sitemapResponse.status, valid: sitemapValid, listedPages },
    robots: { status: robotsResponse.status, valid: robotsValid, blockedPublicPaths },
    pages: pageResults,
    readinessLabel: "internal_heuristic_not_google_ranking",
  };
  await withSeoStoreWriteLock(async () => {
    const latestStore = await readSeoStore(storePath);
    latestStore.audits = [audit, ...latestStore.audits].slice(0, MAX_AUDIT_HISTORY);
    await writeSeoStore(latestStore, storePath);
  });
  return audit;
}

export function auditHistoryCsv(audits: SeoAuditRecord[]) {
  const columns = [
    "completedAt",
    "pagesAudited",
    "missingTitles",
    "missingDescriptions",
    "duplicateTitles",
    "duplicateDescriptions",
    "missingCanonicals",
    "missingH1",
    "brokenInternalLinks",
    "validJsonLdBlocks",
    "invalidJsonLdBlocks",
    "sitemapValid",
    "robotsValid",
  ] as const;
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    columns.map(escape).join(","),
    ...audits.map((audit) => [
      audit.completedAt,
      audit.pagesAudited,
      audit.metrics.missingTitles,
      audit.metrics.missingDescriptions,
      audit.metrics.duplicateTitles,
      audit.metrics.duplicateDescriptions,
      audit.metrics.missingCanonicals,
      audit.metrics.missingH1,
      audit.metrics.brokenInternalLinks,
      audit.metrics.validJsonLdBlocks,
      audit.metrics.invalidJsonLdBlocks,
      audit.sitemap.valid,
      audit.robots.valid,
    ].map(escape).join(",")),
  ].join("\r\n");
}
