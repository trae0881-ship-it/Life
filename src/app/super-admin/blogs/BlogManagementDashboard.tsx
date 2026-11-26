"use client";

import { useEffect, useState, type FormEvent } from "react";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type DisplayStatus = Status | "SCHEDULED";
type BlogPost = {
  id: string; title: string; slug: string; excerpt: string; body: string; featuredImageUrl: string | null;
  featuredImageAlt: string | null; authorName: string; category: string | null; tags: string[];
  status: Status; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null;
  robotsIndex: boolean; publishedAt: string | null; updatedAt: string;
};
type BlogCounts = { all: number; drafts: number; published: number; scheduled: number; archived: number };
type FormValues = Omit<BlogPost, "id" | "publishedAt" | "updatedAt"> & { scheduledAtLocal: string };
const emptyCounts: BlogCounts = { all: 0, drafts: 0, published: 0, scheduled: 0, archived: 0 };
const emptyPost = (authorName: string): FormValues => ({
  title: "", slug: "", excerpt: "", body: "", featuredImageUrl: null, featuredImageAlt: null,
  authorName, category: null, tags: [], status: "DRAFT", seoTitle: null, seoDescription: null,
  canonicalUrl: null, robotsIndex: true, scheduledAtLocal: "",
});

function displayStatus(post: BlogPost): DisplayStatus {
  return post.status === "PUBLISHED" && post.publishedAt && Date.parse(post.publishedAt) > Date.now()
    ? "SCHEDULED"
    : post.status;
}

function localDateTimeValue(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isBlogCounts(value: unknown): value is BlogCounts {
  if (!value || typeof value !== "object") return false;
  const counts = value as Record<string, unknown>;
  return ["all", "drafts", "published", "scheduled", "archived"]
    .every((key) => Number.isSafeInteger(counts[key]) && Number(counts[key]) >= 0);
}

export default function BlogManagementDashboard({ author }: { author: string }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<FormValues>(emptyPost(author));
  const [counts, setCounts] = useState<BlogCounts>(emptyCounts);
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
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed.");
      window.location.assign("/super-login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
      setSigningOut(false);
    }
  }

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
      if (!Array.isArray(result.posts) || !isBlogCounts(result.counts)) {
        throw new Error("Blog list response was incomplete. Refresh the page or contact an administrator.");
      }
      setPosts(result.posts);
      setCounts(result.counts);
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
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        featuredImageUrl: post.featuredImageUrl,
        featuredImageAlt: post.featuredImageAlt,
        authorName: post.authorName,
        category: post.category,
        tags: post.tags ?? [],
        status: post.status,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        canonicalUrl: post.canonicalUrl,
        robotsIndex: post.robotsIndex,
        scheduledAtLocal: post.publishedAt && Date.parse(post.publishedAt) > Date.now()
          ? localDateTimeValue(post.publishedAt)
          : "",
      });
      setPreview(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog post could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let scheduledAt: string | null = null;
    const { scheduledAtLocal, ...postFields } = form;
    if (scheduledAtLocal) {
      const selectedTime = new Date(scheduledAtLocal);
      if (form.status !== "PUBLISHED") {
        setError("Set the post status to Published before scheduling it.");
        return;
      }
      if (!Number.isFinite(selectedTime.getTime()) || selectedTime.getTime() <= Date.now()) {
        setError("Choose a future publication time. The value is interpreted in your browser’s local timezone.");
        return;
      }
      scheduledAt = selectedTime.toISOString();
    }
    const alreadyPublic = posts.some((post) => post.id === postId && displayStatus(post) === "PUBLISHED");
    const confirmation = scheduledAt
      ? `Schedule "${form.title}" for ${new Date(scheduledAt).toLocaleString()} in your local timezone?`
      : `Publish "${form.title}" now? It will become publicly accessible.`;
    if (form.status === "PUBLISHED" && (scheduledAt || !alreadyPublic) && !window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    setNotice("");
    const payload = { ...postFields, tags: form.tags, scheduledAt };
    try {
      const response = await fetch(postId ? `/api/super-admin/blogs/${encodeURIComponent(postId)}` : "/api/super-admin/blogs", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Blog post could not be saved.");
      setPostId(result.post.id);
      setNotice(scheduledAt
        ? `Post scheduled for ${new Date(scheduledAt).toLocaleString()} in your local timezone.`
        : "Blog post saved.");
      await loadPosts(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog post could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: Status) {
    if (status === "PUBLISHED") {
      const post = posts.find((entry) => entry.id === id);
      if (!window.confirm(`Publish "${post?.title ?? "this post"}" now? It will become publicly accessible.`)) return;
    }
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

  async function deletePost(post: BlogPost) {
    if (!window.confirm(`Permanently delete "${post.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/super-admin/blogs/${encodeURIComponent(post.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.deleted) throw new Error(result.error ?? "Blog post could not be deleted.");
      if (postId === post.id) startNewPost();
      setNotice("Blog post deleted.");
      await loadPosts(posts.length === 1 && page > 1 ? page - 1 : page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Blog post could not be deleted.");
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
    setError("");
  }

  return <main className="super-admin-shell">
    <aside className="super-admin-sidebar">
      <a className="super-admin-brand" href="/super-admin">Super Admin<small>LIFE · OPERATIONS</small></a>
      <p className="super-admin-identity"><span>Signed in as</span><b>{author}</b></p>
      <nav aria-label="Super Admin navigation" className="super-admin-nav">
        <a href="/super-admin">Overview and admin tools</a>
        <a href="/super-admin/seo">SEO Management</a>
        <a aria-current="page" className="active" href="/super-admin/blogs">Blog Management</a>
        <a href="/admin/scripts">Head / body scripts</a>
      </nav>
      <div className="super-admin-sidebar-foot">
        <a href="/blogs">Public blog</a>
        <button disabled={signingOut} onClick={() => void signOut()} type="button">
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
    <section className="super-admin-main">
      <header className="super-admin-topbar"><span>BLOG MANAGEMENT</span><span>Super Admin</span></header>
      <div className="super-admin-content">
        <p className="super-admin-eyebrow">LIFE · PUBLISHING</p>
        <h1>Blog Management</h1>
        <p className="super-admin-description">Draft, schedule, and manage articles stored in PostgreSQL. Scheduled posts become public automatically at their publication time.</p>
        <section className="blog-stats" aria-label="Blog totals">
          {([
            ["Total posts", counts.all],
            ["Drafts", counts.drafts],
            ["Scheduled", counts.scheduled],
            ["Published", counts.published],
            ["Archived", counts.archived],
          ] as const).map(([label, count]) => <article key={label}>
            <span>{label}</span><strong aria-live="polite">{loading ? "…" : count}</strong>
          </article>)}
        </section>
        {error && <div className="super-admin-error" role="alert"><p>{error}</p></div>}
        {notice && <p className="seo-message" role="status">{notice}</p>}
        <section className="developers-section">
          <div className="blog-filter">
            <label>Search<input onChange={(event) => setQuery(event.target.value)} value={query} /></label>
            <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
            <button onClick={() => void loadPosts(1)} type="button">Search</button>
            <button onClick={startNewPost} type="button">Create post</button>
          </div>
          {loading ? <p aria-live="polite" className="super-admin-state">Loading posts…</p> : posts.length ? <div className="super-admin-table-wrap">
            <table className="super-admin-user-table">
              <thead><tr><th scope="col">Title</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col">Publish time</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead>
              <tbody>{posts.map((post) => <tr key={post.id}>
                <td>{post.title}</td><td>{post.slug}</td><td><span className={`blog-status blog-status-${displayStatus(post).toLowerCase()}`}>{displayStatus(post)}</span></td>
                <td>{post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "—"}</td><td>{new Date(post.updatedAt ?? "").toLocaleDateString()}</td>
                <td><button disabled={busy} onClick={() => void editPost(post.id)} type="button">Edit</button>{" "}
                  {displayStatus(post) === "DRAFT" && <button disabled={busy} onClick={() => void updateStatus(post.id, "PUBLISHED")} type="button">Publish now</button>}
                  {displayStatus(post) === "SCHEDULED" && <><button disabled={busy} onClick={() => void updateStatus(post.id, "PUBLISHED")} type="button">Publish now</button>{" "}<button disabled={busy} onClick={() => void updateStatus(post.id, "DRAFT")} type="button">Cancel schedule</button></>}
                  {displayStatus(post) === "PUBLISHED" && <button disabled={busy} onClick={() => void updateStatus(post.id, "DRAFT")} type="button">Unpublish</button>}
                  {post.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void updateStatus(post.id, "ARCHIVED")} type="button">Archive</button>}
                  <button className="blog-delete-button" disabled={busy} onClick={() => void deletePost(post)} type="button">Delete</button>
                </td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="blog-empty-state">
            <h2>{query || statusFilter ? "No matching posts" : "No articles yet"}</h2>
            <p>{query || statusFilter ? "Try a different search or status filter." : "Create a draft and preview it before publishing."}</p>
            {!query && !statusFilter && <button onClick={startNewPost} type="button">Create your first post</button>}
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
            <label>Title<input maxLength={160} onChange={(event) => setField("title", event.target.value)} required value={form.title} /><small className="blog-character-count">{form.title.length}/160</small></label>
            <label>Slug<input maxLength={180} onChange={(event) => setField("slug", event.target.value)} placeholder="generated-from-title" value={form.slug} /></label>
            <label>Excerpt<textarea maxLength={320} onChange={(event) => setField("excerpt", event.target.value)} required value={form.excerpt} /><small className="blog-character-count">{form.excerpt.length}/320</small></label>
            <label>Body (plain text)<textarea maxLength={100000} onChange={(event) => setField("body", event.target.value)} required value={form.body} /></label>
            <label>Author<input maxLength={100} onChange={(event) => setField("authorName", event.target.value)} required value={form.authorName} /></label>
            <label>Category<input maxLength={80} onChange={(event) => setField("category", event.target.value || null)} value={form.category ?? ""} /></label>
            <label>Tags (comma separated)<input onChange={(event) => setField("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} value={form.tags.join(", ")} /></label>
            <label>Featured image URL (local path only)<input onChange={(event) => setField("featuredImageUrl", event.target.value || null)} placeholder="/images/article.webp" value={form.featuredImageUrl ?? ""} /></label>
            <label>Image alt text<input maxLength={250} onChange={(event) => setField("featuredImageAlt", event.target.value || null)} value={form.featuredImageAlt ?? ""} /></label>
            <label>Status<select onChange={(event) => {
              const status = event.target.value as Status;
              setForm((current) => ({ ...current, status, scheduledAtLocal: status === "PUBLISHED" ? current.scheduledAtLocal : "" }));
            }} value={form.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published / schedule</option><option value="ARCHIVED">Archived</option></select></label>
            <label>Schedule publication (optional)<input type="datetime-local" onChange={(event) => setField("scheduledAtLocal", event.target.value)} value={form.scheduledAtLocal} /><small>Leave blank to publish immediately. A future time uses your browser’s local timezone.</small></label>
            <label>SEO title<input maxLength={70} onChange={(event) => setField("seoTitle", event.target.value || null)} value={form.seoTitle ?? ""} /><small className="blog-character-count">{(form.seoTitle ?? "").length}/70</small></label>
            <label>SEO description<textarea maxLength={160} onChange={(event) => setField("seoDescription", event.target.value || null)} value={form.seoDescription ?? ""} /><small className="blog-character-count">{(form.seoDescription ?? "").length}/160</small></label>
            <label>Canonical URL (same LIFE origin only)<input onChange={(event) => setField("canonicalUrl", event.target.value || null)} value={form.canonicalUrl ?? ""} /></label>
            <label className="blog-checkbox"><input checked={form.robotsIndex} onChange={(event) => setField("robotsIndex", event.target.checked)} type="checkbox" /> Allow indexing</label>
            <button disabled={busy} type="submit">{busy ? "Saving…" : "Save post"}</button>
          </form>}
        </section>
      </div>
    </section>
  </main>;
}
