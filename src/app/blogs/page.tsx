import type { Metadata } from "next";
import { getPrisma } from "@/server/db";
import { listPublishedBlogPosts } from "@/server/blog-management";
import { metadataForManagedPage } from "@/server/seo-management";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/blogs");
}

export default async function BlogListingPage() {
  let posts;
  try {
    posts = await listPublishedBlogPosts(getPrisma(), 1);
  } catch {
    return <main className="public-blog"><a href="/">← LIFE home</a><h1>Journal temporarily unavailable</h1><p>Blog storage is not ready. The local Blog CMS database migration must be reviewed and approved before publishing.</p></main>;
  }

  return <main className="public-blog">
    <a href="/">← LIFE home</a>
    <p className="super-admin-eyebrow">LIFE · JOURNAL</p>
    <h1>Notes on Jyotish</h1>
    <p>Articles published by LIFE. Editorial content is informational and does not promise future outcomes.</p>
    {!posts.length
      ? <p className="super-admin-unavailable">No articles have been published yet.</p>
      : <div className="public-blog-grid">{posts.map((post) => <article key={post.slug}>
        <p className="super-admin-eyebrow">{post.category ?? "LIFE JOURNAL"} · {post.publishedAt?.toLocaleDateString("en")}</p>
        <h2><a href={`/blogs/${encodeURIComponent(post.slug)}`}>{post.title}</a></h2>
        <p>{post.excerpt}</p>
        <small>By {post.authorName}</small>
      </article>)}</div>}
  </main>;
}
