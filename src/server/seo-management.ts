import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";

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
    path: "/palmistry",
    title: "Palmistry | LIFE",
    description: "A private, offline-first palmistry workspace with manual observations, deterministic interpretations and locally saved readings. No AI or image analysis.",
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

export type SeoCheckStatus = "PASS" | "WARNING" | "FAILED" | "NOT_CHECKED";
export type SeoAuditCheck = {
  status: SeoCheckStatus;
  actual: string;
  expected?: string;
};

export type SeoPageAudit = {
  path: SeoPagePath;
  status: number | null;
  resultStatus?: SeoCheckStatus;
  checks?: {
    http: SeoAuditCheck;
    title: SeoAuditCheck;
    description: SeoAuditCheck;
    canonical: SeoAuditCheck;
    robots: SeoAuditCheck;
    openGraph: SeoAuditCheck;
    h1: SeoAuditCheck;
    imageAlt: SeoAuditCheck;
    internalLinks: SeoAuditCheck;
    jsonLd: SeoAuditCheck;
    sitemap: SeoAuditCheck;
  };
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
  internalLinksNotChecked?: number | null;
  sitemapIncluded?: boolean | null;
  validJsonLdBlocks: number | null;
  invalidJsonLdBlocks: number | null;
  issues?: { severity: "high" | "medium" | "low"; code: string; message: string; suggestion: string }[];
};

export type SeoAuditRecord = {
  id: string;
  completedAt: string;
  pagesAudited: number;
  pagesOmitted?: number;
  resultStatus?: SeoCheckStatus;
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
  sitemap: { status: number | null; valid: boolean; listedPages: number; check?: SeoAuditCheck };
  robots: {
    status: number | null;
    valid: boolean;
    blockedPublicPaths: string[];
    unblockedPrivatePaths?: string[];
    check?: SeoAuditCheck;
  };
  pages: SeoPageAudit[];
  readinessLabel?: "internal_heuristic_not_google_ranking";
};

type SeoStore = {
  version: 1;
  settings: Partial<Record<SeoPagePath, SeoPageSettings>>;
  audits: SeoAuditRecord[];
};

type SeoRepository = Pick<PrismaClient, "$transaction" | "seoPageSetting" | "seoAuditHistory">
  & Partial<Pick<PrismaClient, "blogPost">>;
const MAX_AUDIT_HISTORY = 20;
const MAX_AUDIT_PAGES = 200;
let storeWriteQueue = Promise.resolve();

const emptyStore = (): SeoStore => ({ version: 1, settings: {}, audits: [] });

async function defaultSeoRepository(): Promise<SeoRepository> {
  const { getPrisma } = await import("./db.ts");
  return getPrisma();
}

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

function validAuditCheck(value: unknown): value is SeoAuditCheck {
  return isObject(value)
    && ["PASS", "WARNING", "FAILED", "NOT_CHECKED"].includes(value.status as string)
    && typeof value.actual === "string"
    && (value.expected === undefined || typeof value.expected === "string");
}

function validCheckCollection(value: unknown): value is NonNullable<SeoPageAudit["checks"]> {
  return isObject(value)
    && ["http", "title", "description", "canonical", "robots", "openGraph", "h1", "imageAlt", "internalLinks", "jsonLd", "sitemap"]
      .every((name) => validAuditCheck(value[name]));
}

function validateSeoAuditRecord(value: unknown): SeoAuditRecord | null {
  if (!isObject(value) || typeof value.id !== "string" || !value.id || value.id.length > 100) return null;
  if (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
  if (!isCount(value.pagesAudited) || value.pagesAudited > MAX_AUDIT_PAGES || !Array.isArray(value.pages) || value.pages.length !== value.pagesAudited) return null;
  if (value.pagesOmitted !== undefined && !isCount(value.pagesOmitted)) return null;
  if (value.resultStatus !== undefined && !["PASS", "WARNING", "FAILED", "NOT_CHECKED"].includes(value.resultStatus as string)) return null;
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
  if (sitemap.check !== undefined && !validAuditCheck(sitemap.check)) return null;
  const robots = value.robots;
  if (!isHttpStatus(robots.status) || typeof robots.valid !== "boolean" || !Array.isArray(robots.blockedPublicPaths)) return null;
  if (robots.unblockedPrivatePaths !== undefined && !Array.isArray(robots.unblockedPrivatePaths)) return null;
  if (robots.check !== undefined && !validAuditCheck(robots.check)) return null;
  if (!robots.blockedPublicPaths.every((route) => isAuditablePath(route))) return null;
  if (robots.unblockedPrivatePaths !== undefined && !robots.unblockedPrivatePaths.every((route) => typeof route === "string" && route.startsWith("/"))) return null;

  const seenPaths = new Set<string>();
  const pages: SeoPageAudit[] = [];
  for (const page of value.pages) {
    if (!isObject(page) || !isAuditablePath(page.path) || seenPaths.has(page.path as string)) return null;
    if (!isHttpStatus(page.status)) return null;
    if (page.resultStatus !== undefined && !["PASS", "WARNING", "FAILED", "NOT_CHECKED"].includes(page.resultStatus as string)) return null;
    if (page.checks !== undefined && !validCheckCollection(page.checks)) return null;
    if (!["titlePresent", "descriptionPresent", "canonicalPresent"].every((key) => typeof page[key] === "boolean")) return null;
    if (![page.h1Count, page.internalLinkCount, page.brokenInternalLinks, page.validJsonLdBlocks, page.invalidJsonLdBlocks]
      .every((count) => count === null || isCount(count))) return null;
    if (page.internalLinksNotChecked !== undefined && page.internalLinksNotChecked !== null && !isCount(page.internalLinksNotChecked)) return null;
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
      ...(page.resultStatus ? { resultStatus: page.resultStatus as SeoCheckStatus } : {}),
      ...(validCheckCollection(page.checks) ? { checks: page.checks } : {}),
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
      internalLinksNotChecked: page.internalLinksNotChecked === undefined ? null : page.internalLinksNotChecked as number | null,
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
    ...(value.pagesOmitted === undefined ? {} : { pagesOmitted: value.pagesOmitted as number }),
    ...(value.resultStatus ? { resultStatus: value.resultStatus as SeoCheckStatus } : {}),
    metrics: Object.fromEntries(metricNames.map((name) => [name, metrics[name] ?? 0])) as SeoAuditRecord["metrics"],
    sitemap: { status: sitemap.status, valid: sitemap.valid, listedPages: sitemap.listedPages, ...(validAuditCheck(sitemap.check) ? { check: sitemap.check } : {}) },
    robots: {
      status: robots.status,
      valid: robots.valid,
      blockedPublicPaths: [...robots.blockedPublicPaths] as string[],
      ...(Array.isArray(robots.unblockedPrivatePaths) ? { unblockedPrivatePaths: [...robots.unblockedPrivatePaths] as string[] } : {}),
      ...(validAuditCheck(robots.check) ? { check: robots.check } : {}),
    },
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

async function readDatabaseSeoStore(repository: SeoRepository): Promise<SeoStore> {
  const [settingsRows, auditRows] = await Promise.all([
    repository.seoPageSetting.findMany({ select: { path: true, settings: true } }),
    repository.seoAuditHistory.findMany({
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: MAX_AUDIT_HISTORY,
      select: { id: true, record: true },
    }),
  ]);
  const settings: SeoStore["settings"] = {};
  for (const row of settingsRows) {
    const validated = validateSeoPageSettings(row.settings);
    if (!validated || validated.path !== row.path) {
      throw new Error("SEO management database contains invalid page metadata.");
    }
    settings[row.path] = validated;
  }
  const audits = auditRows.map((row) => {
    const validated = validateSeoAuditRecord(row.record);
    if (!validated || validated.id !== row.id) {
      throw new Error("SEO management database contains invalid audit history.");
    }
    return validated;
  });
  return { version: 1, settings, audits };
}

export async function readSeoStore(storePath?: string, repository?: SeoRepository): Promise<SeoStore> {
  if (!storePath) return readDatabaseSeoStore(repository ?? await defaultSeoRepository());
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

export async function saveSeoPageSettings(
  value: unknown,
  storePath?: string,
  actorUserId?: string,
  repository?: SeoRepository,
) {
  const settings = validateSeoPageSettings(value);
  if (!settings) return null;
  if (!storePath) {
    if (!actorUserId) throw new Error("An authenticated Super Admin is required to save SEO metadata.");
    const database = repository ?? await defaultSeoRepository();
    await database.seoPageSetting.upsert({
      where: { path: settings.path },
      create: {
        path: settings.path,
        settings: settings as Prisma.InputJsonValue,
        updatedByUserId: actorUserId,
      },
      update: {
        settings: settings as Prisma.InputJsonValue,
        updatedByUserId: actorUserId,
      },
    });
    return settings;
  }
  return withSeoStoreWriteLock(async () => {
    const store = await readSeoStore(storePath);
    store.settings[settings.path] = settings;
    await writeSeoStore(store, storePath);
    return settings;
  });
}

export async function getSeoDashboardData(storePath?: string, repository?: SeoRepository) {
  const database = storePath ? undefined : repository ?? await defaultSeoRepository();
  const store = await readSeoStore(storePath, database);
  const pages = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => store.settings[pagePath] ?? defaultSeoSettings(pagePath));
  const publishedIndexableBlogs = database?.blogPost
    ? await database.blogPost.count({
        where: { status: "PUBLISHED", robotsIndex: true, publishedAt: { lte: new Date() } },
      })
    : 0;
  return {
    pages,
    audits: store.audits,
    lastAudit: store.audits[0] ?? null,
    persistence: storePath
      ? {
          type: "test_file" as const,
          durableInProduction: false,
          note: "The file-backed adapter is enabled only when an explicit store path is provided for tests.",
        }
      : {
          type: "postgresql" as const,
          durableInProduction: true,
          note: "SEO metadata and audit history are stored in the application PostgreSQL database.",
        },
    indexedPages: null,
    indexedPagesSource: "unavailable",
    searchConsole: { configured: false, status: "not_configured" as const },
    sitemap: {
      status: getPublicSiteOrigin() ? "configured" as const : "base_url_missing" as const,
      pageCount: pages.filter((page) => page.robots.index && page.canonicalPath === page.path).length + publishedIndexableBlogs,
    },
    robots: { status: "generated_from_safe_defaults" as const },
  };
}

export function getPublicSiteOrigin(environment: NodeJS.ProcessEnv = process.env) {
  const railwayDomain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  const configured = environment.LIFE_PUBLIC_APP_URL?.trim()
    || (railwayDomain ? `https://${railwayDomain.replace(/^https?:\/\//i, "")}` : "")
    || (environment.NODE_ENV === "production" ? "https://life-production-66edc885.up.railway.app" : "");
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

export async function metadataForManagedPage(
  pagePath: SeoPagePath,
  storePath?: string,
  repository?: SeoRepository,
): Promise<Metadata> {
  const definition = pageDefinition(pagePath);
  if (!definition) throw new Error("Unknown managed SEO route.");
  let settings = defaultSeoSettings(pagePath);
  try {
    if (storePath) {
      const store = await readSeoStore(storePath);
      settings = store.settings[pagePath] ?? settings;
    } else {
      const database = repository ?? await defaultSeoRepository();
      const row = await database.seoPageSetting.findUnique({
        where: { path: pagePath },
        select: { settings: true },
      });
      if (row) {
        const storedSettings = validateSeoPageSettings(row.settings);
        if (!storedSettings || storedSettings.path !== pagePath) {
          throw new Error("SEO metadata database contains invalid page settings.");
        }
        settings = storedSettings;
      }
    }
  } catch (error) {
    console.error("Managed SEO metadata storage is unavailable; using built-in defaults.", {
      pagePath,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
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

export async function getSitemapPageSettings(
  loadDashboard: () => Promise<{ pages: SeoPageSettings[] }> = () => getSeoDashboardData(),
): Promise<SeoPageSettings[]> {
  try {
    return (await loadDashboard()).pages;
  } catch (error) {
    console.error("SEO sitemap settings are unavailable; using built-in public-route defaults.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => defaultSeoSettings(pagePath));
  }
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
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", "/admin", "/dashboard", "/super-admin", "/super-login", "/developer/dashboard"],
      },
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

function auditCheck(status: SeoCheckStatus, actual: string, expected?: string): SeoAuditCheck {
  return { status, actual, ...(expected === undefined ? {} : { expected }) };
}

function absoluteUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function overallAuditStatus(checks: SeoAuditCheck[]): SeoCheckStatus {
  if (checks.some((check) => check.status === "FAILED")) return "FAILED";
  if (checks.some((check) => check.status === "WARNING")) return "WARNING";
  if (checks.every((check) => check.status === "NOT_CHECKED")) return "NOT_CHECKED";
  return "PASS";
}

export async function runSeoAudit(options: {
  storePath?: string;
  actorUserId?: string;
  repository?: SeoRepository;
  fetcher?: typeof fetch;
  localOrigin?: string;
  additionalPages?: SeoPageSettings[];
} = {}) {
  const storePath = options.storePath;
  const fetcher = options.fetcher ?? fetch;
  const origin = options.localOrigin ?? localApplicationOrigin();
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "http:" || parsedOrigin.hostname !== "127.0.0.1") {
    throw new Error("SEO audit origin must be the local application loopback address.");
  }

  const repository = options.repository ?? (!storePath ? await defaultSeoRepository() : undefined);
  const store = await readSeoStore(storePath, repository);
  const staticSettings = SEO_PAGE_DEFINITIONS.map(({ path: pagePath }) => store.settings[pagePath] ?? defaultSeoSettings(pagePath));
  let additionalPages = options.additionalPages;
  let blogCanonicalUrls = new Map<string, string>();
  let eligibleBlogPageCount = additionalPages?.length ?? 0;
  if (!additionalPages && repository?.blogPost) {
    eligibleBlogPageCount = await repository.blogPost.count({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
    });
    const blogPosts = await repository.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: MAX_AUDIT_PAGES - staticSettings.length,
      select: {
        slug: true, title: true, excerpt: true, seoTitle: true, seoDescription: true,
        canonicalUrl: true, robotsIndex: true,
      },
    });
    additionalPages = blogPosts.map((post) => {
      const path = `/blogs/${post.slug}`;
      if (post.canonicalUrl) blogCanonicalUrls.set(path, post.canonicalUrl);
      return {
        path,
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt,
        canonicalPath: path,
        robots: { index: post.robotsIndex, follow: true },
        openGraph: { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt },
      };
    });
  }
  const validatedAdditionalSettings = (additionalPages ?? []).filter((page) =>
    isAuditablePath(page.path)
    && page.path.startsWith("/blogs/")
    && isAuditablePath(page.canonicalPath)
    && page.title.trim().length > 0
    && page.description.trim().length > 0
    && typeof page.robots.index === "boolean"
    && typeof page.robots.follow === "boolean");
  const additionalSettings = validatedAdditionalSettings.slice(0, MAX_AUDIT_PAGES - staticSettings.length);
  const pagesOmitted = Math.max(0, eligibleBlogPageCount - additionalSettings.length);
  const settings = [...staticSettings, ...additionalSettings];
  const publicOrigin = getPublicSiteOrigin() ?? parsedOrigin.origin;
  const canonicalExpectedByPath = new Map(settings.map((page) => [
    page.path,
    blogCanonicalUrls.get(page.path) ?? new URL(page.canonicalPath, publicOrigin).toString(),
  ]));
  const expectedSitemapUrls = new Set(settings
    .filter((page) => page.robots.index && (page.path.startsWith("/blogs/") || page.canonicalPath === page.path))
    .flatMap((page) => {
      const expected = absoluteUrl(canonicalExpectedByPath.get(page.path) ?? "");
      return expected && new URL(expected).origin === publicOrigin ? [expected] : [];
    }));
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
    const robotsContent = htmlMeta(html, (attributes) => attributes.name?.toLowerCase() === "robots").toLowerCase();
    const robots = robotsContent.split(/[\s,]+/);
    const robotsIndex = !robots.includes("noindex");
    const robotsFollow = !robots.includes("nofollow");
    const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
    const imagesMissingAlt = imageTags.filter((match) => !("alt" in parseAttributes(match[0]))).length;
    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    let canonicalActual = "";
    for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
      const attributes = parseAttributes(match[0]);
      if (!attributes.rel?.toLowerCase().split(/\s+/).includes("canonical") || !attributes.href) continue;
      try {
        const canonical = new URL(attributes.href, url);
        canonicalActual = canonical.toString();
        break;
      } catch {
        continue;
      }
    }
    const canonicalExpected = canonicalExpectedByPath.get(settingsForPage.path) ?? "";
    const normalizedCanonicalExpected = absoluteUrl(canonicalExpected);
    const canonicalPresent = Boolean(
      canonicalActual
      && normalizedCanonicalExpected
      && new URL(normalizedCanonicalExpected).origin === publicOrigin
      && canonicalActual === normalizedCanonicalExpected,
    );
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
    const internalLinks = anchors.flatMap((anchor) => {
      const href = parseAttributes(anchor[0]).href;
      if (!href) return [];
      try {
        const target = new URL(href, url);
        return target.origin === parsedOrigin.origin ? [{ path: target.pathname }] : [];
      } catch {
        return [];
      }
    });
    const checkedInternalLinks = internalLinks.filter((link) => auditedPaths.has(link.path));
    const internalLinksNotChecked = internalLinks.length - checkedInternalLinks.length;
    const h1Count = [...html.matchAll(/<h1\b/gi)].length;
    const successfulResponse = response.status === 200;
    const pageChecks = {
      http: auditCheck(successfulResponse ? "PASS" : "FAILED", `HTTP ${response.status}`, "HTTP 200"),
      title: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : !title ? "FAILED" : title.length < 30 || title.length > 70 ? "WARNING" : "PASS",
        title ? `${title.length} characters` : "Missing",
        "Present; 30–70 characters is a review heuristic",
      ),
      description: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : !description ? "FAILED" : description.length < 70 || description.length > 160 ? "WARNING" : "PASS",
        description ? `${description.length} characters` : "Missing",
        "Present; 70–160 characters is a review heuristic",
      ),
      canonical: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : canonicalPresent ? "PASS" : "FAILED",
        canonicalActual || "Missing",
        canonicalExpected || "A same-site canonical URL",
      ),
      robots: auditCheck(
        !successfulResponse ? "NOT_CHECKED"
          : robotsIndex === settingsForPage.robots.index && robotsFollow === settingsForPage.robots.follow ? "PASS" : "FAILED",
        robotsContent || "No explicit robots directive; defaults apply",
        `${settingsForPage.robots.index ? "index" : "noindex"}, ${settingsForPage.robots.follow ? "follow" : "nofollow"}`,
      ),
      openGraph: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : ogTitle && ogDescription ? "PASS" : "WARNING",
        `${ogTitle ? "title present" : "title missing"}; ${ogDescription ? "description present" : "description missing"}`,
        "Open Graph title and description",
      ),
      h1: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : h1Count === 1 ? "PASS" : "WARNING",
        `${h1Count} H1 heading(s)`,
        "Exactly one H1 heading",
      ),
      imageAlt: auditCheck(
        !successfulResponse ? "NOT_CHECKED" : imagesMissingAlt ? "WARNING" : "PASS",
        `${imagesMissingAlt} image(s) missing an alt attribute`,
        "0 images missing an alt attribute",
      ),
      internalLinks: auditCheck(
        !successfulResponse || internalLinks.length === 0 ? "NOT_CHECKED"
          : internalLinksNotChecked > 0 ? "WARNING" : "PASS",
        `${checkedInternalLinks.length} checked; ${internalLinksNotChecked} outside the audited route set`,
        "All same-site links resolve to audited public routes",
      ),
      jsonLd: auditCheck(
        !successfulResponse || validJsonLdBlocks + invalidJsonLdBlocks === 0 ? "NOT_CHECKED"
          : invalidJsonLdBlocks ? "FAILED" : "PASS",
        `${validJsonLdBlocks} valid; ${invalidJsonLdBlocks} invalid block(s)`,
        "Every present JSON-LD block parses as JSON",
      ),
      sitemap: auditCheck("NOT_CHECKED", "Sitemap not yet checked"),
    };
    pageResults.push({
      path: settingsForPage.path,
      status: response.status,
      resultStatus: overallAuditStatus(Object.values(pageChecks)),
      checks: pageChecks,
      titlePresent: Boolean(title),
      titleLength: title.length,
      descriptionPresent: Boolean(description),
      descriptionLength: description.length,
      canonicalPresent,
      robotsIndex,
      robotsFollow,
      openGraphTitlePresent: Boolean(ogTitle),
      openGraphDescriptionPresent: Boolean(ogDescription),
      imageCount: imageTags.length,
      imagesMissingAlt,
      h1Count: headingLevels.filter((level) => level === 1).length,
      headingLevels,
      internalLinkCount: internalLinks.length,
      brokenInternalLinks: 0,
      internalLinksNotChecked,
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
    if (page.checks) {
      page.checks.internalLinks = auditCheck(
        brokenInternalLinks > 0 ? "FAILED"
          : (page.internalLinksNotChecked ?? 0) > 0 ? "WARNING"
          : (page.internalLinkCount ?? 0) > 0 ? "PASS" : "NOT_CHECKED",
        `${(page.internalLinkCount ?? 0) - (page.internalLinksNotChecked ?? 0)} checked; ${page.internalLinksNotChecked ?? 0} outside the audited route set; ${brokenInternalLinks} broken`,
        "All same-site links resolve to audited public routes",
      );
      page.resultStatus = overallAuditStatus(Object.values(page.checks));
    }
  }

  const robotsResponse = await fetcher(new URL("/robots.txt", parsedOrigin), {
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const robotsBody = robotsResponse.ok ? await readBoundedBody(robotsResponse) : "";
  const indexablePaths = settings.filter((page) => page.robots.index).map((page) => page.path);
  const blockedPublicPaths = validateRobotsBody(robotsBody, indexablePaths);
  const privatePaths = ["/api/health", "/admin/scripts", "/dashboard", "/super-admin", "/super-login", "/developer/dashboard"];
  const blockedPrivatePaths = validateRobotsBody(robotsBody, privatePaths);
  const unblockedPrivatePaths = privatePaths.filter((pagePath) => !blockedPrivatePaths.includes(pagePath));
  const expectedRobotsSitemap = new URL("/sitemap.xml", publicOrigin).toString();
  const robotsSitemap = [...robotsBody.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  const robotsValid = robotsResponse.ok
    && /^User-Agent:/im.test(robotsBody)
    && blockedPublicPaths.length === 0
    && unblockedPrivatePaths.length === 0
    && robotsSitemap.includes(expectedRobotsSitemap);

  const sitemapResponse = await fetcher(new URL("/sitemap.xml", parsedOrigin), {
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const sitemapBody = sitemapResponse.ok ? await readBoundedBody(sitemapResponse) : "";
  const sitemapLocations = [...sitemapBody.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => match[1].trim());
  const normalizedSitemapLocations = sitemapLocations.flatMap((location) => {
    try {
      const url = new URL(location);
      return !url.search && !url.hash ? [url.toString()] : [];
    } catch {
      return [];
    }
  });
  const listedExpectedUrls = new Set(normalizedSitemapLocations.filter((location) => expectedSitemapUrls.has(location)));
  const listedPages = listedExpectedUrls.size;
  const indexableRoutesAvailable = settings
    .filter((page) => page.robots.index
      && (page.path.startsWith("/blogs/") || page.canonicalPath === page.path)
      && expectedSitemapUrls.has(absoluteUrl(canonicalExpectedByPath.get(page.path) ?? "") ?? ""))
    .every((page) => fetched.get(page.path)?.status === 200);
  const sitemapValid = sitemapResponse.ok
    && /<urlset\b/i.test(sitemapBody)
    && normalizedSitemapLocations.length === expectedSitemapUrls.size
    && listedPages === expectedSitemapUrls.size
    && indexableRoutesAvailable;
  for (const page of pageResults) {
    if (!page.robotsIndex) {
      page.sitemapIncluded = null;
      if (page.checks) page.checks.sitemap = auditCheck("NOT_CHECKED", "Page is configured as noindex");
    } else {
      const expectedUrl = canonicalExpectedByPath.get(page.path);
      const normalizedExpectedUrl = expectedUrl ? absoluteUrl(expectedUrl) : null;
      const included = Boolean(normalizedExpectedUrl && listedExpectedUrls.has(normalizedExpectedUrl));
      page.sitemapIncluded = included;
      if (page.checks) {
        const status = included && page.status === 200 ? "PASS" : "FAILED";
        const actual = included ? `Included; page returned HTTP ${page.status}` : "Missing from sitemap";
        page.checks.sitemap = auditCheck(status, actual, expectedUrl);
      }
    }
    if (page.checks) page.resultStatus = overallAuditStatus(Object.values(page.checks));
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
    const expectedSettings = settings.find((entry) => entry.path === page.path);
    if (page.robotsIndex === false && expectedSettings?.robots.index !== false) page.issues?.push({ severity: "high", code: "ROBOTS_NOINDEX", message: "Rendered robots metadata blocks indexing.", suggestion: "Remove noindex only if this public page should be discoverable." });
    if (!page.openGraphTitlePresent || !page.openGraphDescriptionPresent) page.issues?.push({ severity: "low", code: "OPEN_GRAPH_INCOMPLETE", message: "Open Graph title or description is missing.", suggestion: "Provide social-sharing metadata consistent with visible page content." });
    if ((page.imagesMissingAlt ?? 0) > 0) page.issues?.push({ severity: "medium", code: "IMAGE_ALT_MISSING", message: `${page.imagesMissingAlt} image(s) have no non-empty alt text.`, suggestion: "Add concise alt text for informative images; use empty alt text only for decorative images." });
    if (page.h1Count === 0 || page.h1Count !== 1) page.issues?.push({ severity: "low", code: "H1_STRUCTURE", message: `Page has ${page.h1Count} H1 headings.`, suggestion: "Review the page heading hierarchy and use a clear primary heading." });
    if (page.headingLevels?.some((level, index, levels) => index > 0 && level > levels[index - 1] + 1)) page.issues?.push({ severity: "low", code: "HEADING_HIERARCHY", message: "Heading levels skip one or more ranks.", suggestion: "Use headings in a logical hierarchy without skipping levels." });
    if (page.brokenInternalLinks && page.brokenInternalLinks > 0) page.issues?.push({ severity: "high", code: "BROKEN_INTERNAL_LINK", message: `${page.brokenInternalLinks} links to audited LIFE routes failed.`, suggestion: "Update internal links to working public routes." });
    if (expectedSettings?.robots.index && page.sitemapIncluded === false) page.issues?.push({ severity: "low", code: "SITEMAP_OMISSION", message: "Page is not listed in the current sitemap.", suggestion: "Include it only if its canonical route is public and indexable." });
  }
  const robotsCheck = auditCheck(
    robotsValid ? "PASS" : "FAILED",
    `HTTP ${robotsResponse.status}; ${blockedPublicPaths.length} eligible public page(s) blocked; ${unblockedPrivatePaths.length} private route(s) not blocked; sitemap ${robotsSitemap.includes(expectedRobotsSitemap) ? "declared" : "not declared"}`,
    "HTTP 200, eligible public routes allowed, private routes blocked, and the configured sitemap declared",
  );
  const sitemapCheck = auditCheck(
    sitemapValid ? "PASS" : "FAILED",
    `HTTP ${sitemapResponse.status}; ${listedPages} expected URL(s) of ${expectedSitemapUrls.size} listed; all included routes return HTTP 200: ${indexableRoutesAvailable}`,
    `${expectedSitemapUrls.size} unique, same-origin canonical URL(s), each resolving HTTP 200`,
  );
  const overallChecks = [
    robotsCheck,
    sitemapCheck,
    ...pageResults.flatMap((page) => page.checks ? Object.values(page.checks) : []),
    ...(pagesOmitted > 0 ? [auditCheck("WARNING", `${pagesOmitted} published blog page(s) omitted by the audit page limit`)] : []),
  ];
  const audit: SeoAuditRecord = {
    id: randomUUID(),
    completedAt: new Date().toISOString(),
    pagesAudited: pageResults.length,
    pagesOmitted,
    resultStatus: overallAuditStatus(overallChecks),
    metrics,
    sitemap: { status: sitemapResponse.status, valid: sitemapValid, listedPages, check: sitemapCheck },
    robots: { status: robotsResponse.status, valid: robotsValid, blockedPublicPaths, unblockedPrivatePaths, check: robotsCheck },
    pages: pageResults,
    readinessLabel: "internal_heuristic_not_google_ranking",
  };
  if (storePath) {
    await withSeoStoreWriteLock(async () => {
      const latestStore = await readSeoStore(storePath);
      latestStore.audits = [audit, ...latestStore.audits].slice(0, MAX_AUDIT_HISTORY);
      await writeSeoStore(latestStore, storePath);
    });
  } else {
    const actorUserId = options.actorUserId;
    if (!actorUserId) throw new Error("An authenticated Super Admin is required to save SEO audit history.");
    const repository = options.repository ?? await defaultSeoRepository();
    await repository.$transaction(async (transaction) => {
      await transaction.seoAuditHistory.create({
        data: {
          id: audit.id,
          completedAt: new Date(audit.completedAt),
          pagesAudited: audit.pagesAudited,
          record: audit as Prisma.InputJsonValue,
          actorUserId,
        },
      });
      const retained = await transaction.seoAuditHistory.findMany({
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        take: MAX_AUDIT_HISTORY,
        select: { id: true },
      });
      await transaction.seoAuditHistory.deleteMany({
        where: { id: { notIn: retained.map((row) => row.id) } },
      });
    });
  }
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
    "overallStatus",
    "pagesOmitted",
    "sitemapCheckStatus",
    "robotsCheckStatus",
    "unblockedPrivatePaths",
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
      audit.resultStatus ?? "NOT_CHECKED",
      audit.pagesOmitted ?? 0,
      audit.sitemap.check?.status ?? "NOT_CHECKED",
      audit.robots.check?.status ?? "NOT_CHECKED",
      audit.robots.unblockedPrivatePaths?.length ?? 0,
    ].map(escape).join(",")),
  ].join("\r\n");
}
