import type { MetadataRoute } from "next";
import {
  createSitemapEntries,
  getSitemapPageSettings,
  getPublicSiteOrigin,
} from "@/server/seo-management";
import { getPrisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin();
  if (!origin) return [];
  const staticEntries = createSitemapEntries(origin, await getSitemapPageSettings());
  let posts: { slug: string; canonicalUrl: string | null; publishedAt: Date | null }[];
  try {
    posts = await getPrisma().blogPost.findMany({
      where: { status: "PUBLISHED", robotsIndex: true, publishedAt: { lte: new Date() } },
      select: { slug: true, canonicalUrl: true, publishedAt: true },
    });
  } catch {
    console.error("Published blog routes could not be added to the sitemap; verify Blog CMS migration status.");
    return staticEntries;
  }
  const blogEntries = posts.flatMap((post) => {
    const url = post.canonicalUrl ?? new URL(`/blogs/${encodeURIComponent(post.slug)}`, origin).toString();
    try {
      const canonical = new URL(url);
      if (canonical.origin !== origin || canonical.username || canonical.password || canonical.search || canonical.hash) return [];
    } catch {
      return [];
    }
    return [{ url, ...(post.publishedAt ? { lastModified: post.publishedAt } : {}) }];
  });
  return [...staticEntries, ...blogEntries];
}