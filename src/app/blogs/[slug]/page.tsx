import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/server/db";
import { findPublishedBlogPost } from "@/server/blog-management";
import { getPublicSiteOrigin } from "@/server/seo-management";

export const dynamic = "force-dynamic";
type BlogPageProps = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  try {
    return { kind: "ready" as const, post: await findPublishedBlogPost(getPrisma(), slug) };
  } catch {
    return { kind: "unavailable" as const };
  }
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPost(slug);
  if (result.kind === "unavailable" || !result.post) return { title: "Article unavailable | LIFE", robots: { index: false, follow: false } };
  const post = result.post;
  const originText = getPublicSiteOrigin();
  const origin = originText ? new URL(originText) : null;
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    ...(post.canonicalUrl ? { alternates: { canonical: post.canonicalUrl } } : origin ? { alternates: { canonical: new URL(`/blogs/${post.slug}`, origin) } } : {}),
    robots: { index: post.robotsIndex, follow: true },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      ...(origin ? { url: new URL(`/blogs/${post.slug}`, origin) } : {}),
      ...(post.featuredImageUrl ? { images: [{ url: post.featuredImageUrl, alt: post.featuredImageAlt || "" }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const result = await getPost(slug);
  if (result.kind === "unavailable") return <main className="public-blog"><a href="/blogs">← All articles</a><h1>Blog storage is not ready</h1><p>Review and approve the pending Blog CMS database migration before using published articles.</p></main>;
  const post = result.post;
  if (!post) notFound();
  const paragraphs = post.body.split(/\n{2,}/).filter(Boolean);
  return <main className="public-blog">
    <a href="/blogs">← All articles</a>
    <article className="public-blog-post">
      <p className="super-admin-eyebrow">{post.category ?? "LIFE JOURNAL"} · {post.publishedAt?.toLocaleDateString("en")}</p>
      <h1>{post.title}</h1>
      <p className="public-blog-excerpt">{post.excerpt}</p>
      <p className="public-blog-author">By {post.authorName}</p>
      {post.featuredImageUrl && <img alt={post.featuredImageAlt ?? ""} src={post.featuredImageUrl} />}
      <div className="public-blog-body">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {!!post.tags.length && <p className="public-blog-tags">Topics: {post.tags.join(" · ")}</p>}
      <a href="/disclaimer">Read LIFE’s informational-use disclaimer</a>
    </article>
  </main>;
}
