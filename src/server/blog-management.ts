import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { getPublicSiteOrigin } from "./seo-management.ts";

export const BLOG_PAGE_SIZE = 20;
export const BLOG_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

type BlogInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  authorName: string;
  category: string | null;
  tags: string[];
  status: BlogStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  publishedAt: Date | null;
};

export type BlogRepository = Pick<PrismaClient, "blogPost">;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number, required: boolean) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return text.length > (required ? 0 : -1) && text.length <= max ? text : null;
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180).replace(/-+$/g, "");
}

function safeLocalImageUrl(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  return value;
}

function safeCanonicalUrl(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;
  const publicOrigin = getPublicSiteOrigin();
  if (!publicOrigin) return undefined;
  try {
    const url = new URL(value);
    const configured = new URL(publicOrigin);
    if (url.origin !== configured.origin || url.username || url.password || url.search || url.hash) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeBlogInput(value: unknown): BlogInput | null {
  if (!record(value)) return null;
  const title = cleanText(value.title, 160, true);
  const excerpt = cleanText(value.excerpt, 320, true);
  const body = cleanText(value.body, 100_000, true);
  const authorName = cleanText(value.authorName, 100, true);
  const rawSlug = cleanText(value.slug, 180, true);
  const slug = rawSlug ? slugify(rawSlug || title || "") : title ? slugify(title) : "";
  const status = BLOG_STATUSES.includes(value.status as BlogStatus) ? value.status as BlogStatus : "DRAFT";
  const featuredImageUrl = safeLocalImageUrl(value.featuredImageUrl);
  const featuredImageAlt = value.featuredImageUrl ? cleanText(value.featuredImageAlt, 250, true) : cleanText(value.featuredImageAlt, 250, false);
  const canonicalUrl = safeCanonicalUrl(value.canonicalUrl);
  const category = value.category === null || value.category === "" ? null : cleanText(value.category, 80, true);
  const seoTitle = value.seoTitle === null || value.seoTitle === "" ? null : cleanText(value.seoTitle, 70, true);
  const seoDescription = value.seoDescription === null || value.seoDescription === "" ? null : cleanText(value.seoDescription, 160, true);
  if (
    !title || !excerpt || !body || !authorName || !slug
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    || featuredImageUrl === undefined || (featuredImageUrl !== null && featuredImageAlt === null)
    || canonicalUrl === undefined
    || (value.category && !category)
    || (value.seoTitle && !seoTitle)
    || (value.seoDescription && !seoDescription)
    || typeof value.robotsIndex !== "boolean"
    || !Array.isArray(value.tags) || value.tags.length > 20
    || !value.tags.every((tag) => typeof tag === "string" && tag.trim().length > 0 && tag.trim().length <= 40)
  ) return null;

  return {
    title, slug, excerpt, body, featuredImageUrl, featuredImageAlt,
    authorName, category, tags: [...new Set((value.tags as string[]).map((tag) => tag.trim()))],
    status, seoTitle, seoDescription, canonicalUrl, robotsIndex: value.robotsIndex,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };
}

export function validateBlogInput(value: unknown) {
  return normalizeBlogInput(value);
}

export function makeBlogSlug(value: string) {
  return slugify(value);
}

export async function listBlogPosts(
  repository: BlogRepository,
  options: { page: number; query: string; status?: BlogStatus },
) {
  const where: Prisma.BlogPostWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.query ? {
      OR: [
        { title: { contains: options.query, mode: "insensitive" } },
        { slug: { contains: options.query, mode: "insensitive" } },
        { authorName: { contains: options.query, mode: "insensitive" } },
      ],
    } : {}),
  };
  const [total, posts] = await Promise.all([
    repository.blogPost.count({ where }),
    repository.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (options.page - 1) * BLOG_PAGE_SIZE,
      take: BLOG_PAGE_SIZE,
      select: {
        id: true, title: true, slug: true, excerpt: true, authorName: true,
        category: true, status: true, publishedAt: true, updatedAt: true,
      },
    }),
  ]);
  return { posts, total, page: options.page, pageCount: Math.ceil(total / BLOG_PAGE_SIZE) };
}

export async function createBlogPost(
  repository: BlogRepository,
  value: unknown,
  authorId: string,
) {
  const input = normalizeBlogInput(value);
  if (!input) return null;
  return repository.blogPost.create({
    data: { ...input, authorId },
    select: { id: true, title: true, slug: true, excerpt: true, status: true, publishedAt: true },
  });
}

export async function updateBlogPost(
  repository: BlogRepository,
  id: string,
  value: unknown,
) {
  const input = normalizeBlogInput(value);
  if (!input || !id || id.length > 100) return null;
  const previous = await repository.blogPost.findUnique({ where: { id }, select: { id: true, status: true, publishedAt: true } });
  if (!previous) return null;
  const publishedAt = input.status === "PUBLISHED"
    ? previous.status === "PUBLISHED" ? previous.publishedAt : new Date()
    : null;
  return repository.blogPost.update({
    where: { id },
    data: { ...input, publishedAt },
    select: { id: true, title: true, slug: true, excerpt: true, status: true, publishedAt: true },
  });
}

export async function changeBlogStatus(repository: BlogRepository, id: string, status: unknown) {
  if (!BLOG_STATUSES.includes(status as BlogStatus) || !id || id.length > 100) return null;
  return repository.blogPost.update({
    where: { id },
    data: {
      status: status as BlogStatus,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true },
  });
}

export async function findPublishedBlogPost(repository: BlogRepository, slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180) return null;
  return repository.blogPost.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    select: {
      title: true, slug: true, excerpt: true, body: true, featuredImageUrl: true,
      featuredImageAlt: true, authorName: true, category: true, tags: true,
      seoTitle: true, seoDescription: true, canonicalUrl: true, robotsIndex: true, publishedAt: true,
    },
  });
}

export async function listPublishedBlogPosts(repository: BlogRepository, page: number) {
  const safePage = Math.max(1, Math.min(10_000, Math.floor(page)));
  return repository.blogPost.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (safePage - 1) * BLOG_PAGE_SIZE,
    take: BLOG_PAGE_SIZE,
    select: { title: true, slug: true, excerpt: true, authorName: true, category: true, publishedAt: true },
  });
}
