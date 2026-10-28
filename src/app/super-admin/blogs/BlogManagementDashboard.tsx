"use client";

import { useEffect, useState, type FormEvent } from "react";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type BlogPost = {
  id: string; title: string; slug: string; excerpt: string; body: string; featuredImageUrl: string | null;
  featuredImageAlt: string | null; authorName: string; category: string | null; tags: string[];
  status: Status; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null;
  robotsIndex: boolean; publishedAt: string | null; updatedAt: string;
};
type FormValues = Omit<BlogPost, "id" | "publishedAt" | "updatedAt">;
const emptyPost = (authorName: string): FormValues => ({
  title: "", slug: "", excerpt: "", body: "", featuredImageUrl: null, featuredImageAlt: null,
  authorName, category: null, tags: [], status: "DRAFT", seoTitle: null, seoDescription: null,
  canonicalUrl: null, robotsIndex: true,
});

export default function BlogManagementDashboard({ author }: { author: string }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<FormValues>(emptyPost(author));
  const [postId, setPostId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPosts(nextPage = page) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/super-admin/blogs?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Blog posts could not be loaded.");
      setPosts(result.posts);
      setPage(result.page);
      setPageCount(Math.max(1, result.pageCount));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog posts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPosts(1); }, []);

  async function editPost(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/super-admin/blogs/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Blog post could not be loaded.");
      const post = result.post as BlogPost;
      setPostId(post.id);
      setForm({ ...post, tags: post.tags ?? [] });
      setPreview(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog post could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const payload = { ...form, tags: form.tags };
    try {
      const response = await fetch(postId ? `/api/super-admin/blogs/${encodeURIComponent(postId)}` : "/api/super-admin/blogs", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Blog post could not be saved.");
      setPostId(result.post.id);
      setNotice("Blog post saved.");
      await loadPosts(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog post could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: Status) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/super-admin/blogs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusOnly: true, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Blog status could not be changed.");
      setNotice(`Post status changed to ${status.toLowerCase()}.`);
      await loadPosts(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  function setField<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewPost() {
    setPostId("");
    setForm(emptyPost(author));
    setPreview(false);
    setNotice("");
  }

  return <main className="super-admin-shell">
    <aside className="super-admin-sidebar">
      <a className="super-admin-brand" href="/super-admin">Super Admin<small>LIFE · OPERATIONS</small></a>
      <nav aria-label="Super Admin navigation" className="super-admin-nav">
        <a href="/super-admin">Overview and admin tools</a>
        <a href="/super-admin/seo">SEO Management</a>
        <a aria-current="page" className="active" href="/super-admin/blogs">Blog Management</a>
        <a href="/admin/scripts">Head / body scripts</a>
      </nav>
      <div className="super-admin-sidebar-foot"><a href="/blogs">Public blog</a><a href="/super-login">Sign in</a></div>
    </aside>
    <section className="super-admin-main">
      <header className="super-admin-topbar"><span>BLOG MANAGEMENT</span><span>Super Admin</span></header>
      <div className="super-admin-content">
        <p className="super-admin-eyebrow">LIFE · PUBLISHING</p>
        <h1>Blog Management</h1>
        <p className="super-admin-description">Draft and manage articles. Only published posts are publicly readable. Publishing requires the prepared database migration to be approved and applied.</p>
        {error && <p className="super-admin-error" role="alert">{error}</p>}
        {notice && <p className="seo-message" role="status">{notice}</p>}
        <section className="developers-section">
          <div className="blog-filter">
            <label>Search<input onChange={(event) => setQuery(event.target.value)} value={query} /></label>
            <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
            <button onClick={() => void loadPosts(1)} type="button">Search</button>
            <button onClick={startNewPost} type="button">Create post</button>
          </div>
          {loading ? <p aria-live="polite">Loading posts…</p> : <div className="super-admin-table-wrap">
            <table className="super-admin-user-table">
              <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>{posts.map((post) => <tr key={post.id}>
                <td>{post.title}</td><td>{post.slug}</td><td>{post.status}</td><td>{new Date(post.updatedAt ?? "").toLocaleDateString()}</td>
                <td><button disabled={busy} onClick={() => void editPost(post.id)} type="button">Edit</button>{" "}
                  {post.status !== "PUBLISHED" && <button disabled={busy} onClick={() => void updateStatus(post.id, "PUBLISHED")} type="button">Publish</button>}
                  {post.status === "PUBLISHED" && <button disabled={busy} onClick={() => void updateStatus(post.id, "DRAFT")} type="button">Unpublish</button>}
                  {post.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void updateStatus(post.id, "ARCHIVED")} type="button">Archive</button>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>}
          <div className="super-admin-pagination"><button disabled={page <= 1 || loading} onClick={() => void loadPosts(page - 1)} type="button">Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount || loading} onClick={() => void loadPosts(page + 1)} type="button">Next</button></div>
        </section>

        <section className="blog-editor">
          <div className="blog-editor-title"><h2>{postId ? "Edit post" : "Create post"}</h2><button onClick={() => setPreview((shown) => !shown)} type="button">{preview ? "Edit content" : "Preview"}</button></div>
          {preview ? <article className="blog-preview">
            <p className="super-admin-eyebrow">PREVIEW · {form.status}</p><h2>{form.seoTitle || form.title || "Untitled post"}</h2><p>{form.seoDescription || form.excerpt}</p>
            {form.featuredImageUrl && <img alt={form.featuredImageAlt ?? ""} src={form.featuredImageUrl} />}
            <p className="blog-preview-body">{form.body}</p>
          </article> : <form className="blog-form" onSubmit={(event) => void savePost(event)}>
            <label>Title<input maxLength={160} onChange={(event) => setField("title", event.target.value)} required value={form.title} /></label>
            <label>Slug<input maxLength={180} onChange={(event) => setField("slug", event.target.value)} placeholder="generated-from-title" value={form.slug} /></label>
            <label>Excerpt<textarea maxLength={320} onChange={(event) => setField("excerpt", event.target.value)} required value={form.excerpt} /></label>
            <label>Body (plain text)<textarea maxLength={100000} onChange={(event) => setField("body", event.target.value)} required value={form.body} /></label>
            <label>Author<input maxLength={100} onChange={(event) => setField("authorName", event.target.value)} required value={form.authorName} /></label>
            <label>Category<input maxLength={80} onChange={(event) => setField("category", event.target.value || null)} value={form.category ?? ""} /></label>
            <label>Tags (comma separated)<input onChange={(event) => setField("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} value={form.tags.join(", ")} /></label>
            <label>Featured image URL (local path only)<input onChange={(event) => setField("featuredImageUrl", event.target.value || null)} placeholder="/images/article.webp" value={form.featuredImageUrl ?? ""} /></label>
            <label>Image alt text<input maxLength={250} onChange={(event) => setField("featuredImageAlt", event.target.value || null)} value={form.featuredImageAlt ?? ""} /></label>
            <label>Status<select onChange={(event) => setField("status", event.target.value as Status)} value={form.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
            <label>SEO title<input maxLength={70} onChange={(event) => setField("seoTitle", event.target.value || null)} value={form.seoTitle ?? ""} /></label>
            <label>SEO description<textarea maxLength={160} onChange={(event) => setField("seoDescription", event.target.value || null)} value={form.seoDescription ?? ""} /></label>
            <label>Canonical URL (same LIFE origin only)<input onChange={(event) => setField("canonicalUrl", event.target.value || null)} value={form.canonicalUrl ?? ""} /></label>
            <label className="blog-checkbox"><input checked={form.robotsIndex} onChange={(event) => setField("robotsIndex", event.target.checked)} type="checkbox" /> Allow indexing</label>
            <button disabled={busy} type="submit">{busy ? "Saving…" : "Save post"}</button>
          </form>}
        </section>
      </div>
    </section>
  </main>;
}
