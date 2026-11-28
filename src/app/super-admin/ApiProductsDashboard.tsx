"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ProductStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "ACTIVE" | "REJECTED" | "INACTIVE" | "SUSPENDED";
type Developer = { id: string; email: string; fullName: string | null };
type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  developerUserId: string | null;
  developer: Developer | null;
  category: string | null;
  pricingModel: string | null;
  endpoints: string[];
  defaultRequestsPerMinute: number;
  defaultDailyQuota: number;
  defaultMonthlyQuota: number;
  enabled: boolean;
  status: ProductStatus;
  approvalStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  totalRequests: number;
  currentMonthRequests: number;
};
type Summary = {
  totalProducts: number;
  activeProducts: number;
  pendingApproval: number;
  rejectedProducts: number;
  inactiveProducts: number;
  totalDevelopers: number;
  totalApiRequests: number;
};
type Filters = {
  q: string;
  category: string;
  developerId: string;
  status: string;
  approval: string;
  createdFrom: string;
  createdTo: string;
  sort: string;
  order: string;
};
type Inventory = {
  products: Product[];
  page: number;
  pageCount: number;
  total: number;
  summary: Summary;
  platform: { apiBasePath: string; apiVersion: string; authenticationType: string; documentationPath: string };
};
type AuditEvent = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; email: string };
};
type ProductDetails = {
  product: Product;
  totalRequests: number;
  currentMonthRequests: number;
  apiBasePath: string;
  apiVersion: string;
  authenticationType: string;
  documentationPath: string;
  audit: AuditEvent[];
};

const emptyFilters: Filters = {
  q: "", category: "", developerId: "", status: "ALL", approval: "ALL",
  createdFrom: "", createdTo: "", sort: "createdAt", order: "desc",
};

function isInventory(value: unknown): value is Inventory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.products)
    && Number.isSafeInteger(data.page)
    && Number.isSafeInteger(data.pageCount)
    && Number.isSafeInteger(data.total)
    && Boolean(data.summary) && typeof data.summary === "object"
    && Boolean(data.platform) && typeof data.platform === "object";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function ApiProductsDashboard() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPricingModel, setEditPricingModel] = useState("");
  const [rejectingProductId, setRejectingProductId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("/api");

  const load = useCallback(async (requestedPage: number, selectedFilters: Filters) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ inventory: "true", page: String(requestedPage), pageSize: "25" });
    for (const [key, value] of Object.entries(selectedFilters)) {
      if (value && value !== "ALL") params.set(key, value);
    }
    try {
      const response = await fetch(`/api/platform/products?${params.toString()}`, { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "The product inventory could not be loaded.";
        throw new Error(message);
      }
      if (!isInventory(result)) throw new Error("The product inventory response was invalid.");
      setInventory(result);
      setPage(result.page);
      setAppliedFilters(selectedFilters);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The product inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (productId: string) => {
    setDetailsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/platform/products/${encodeURIComponent(productId)}`, { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Product details could not be loaded.";
        throw new Error(message);
      }
      if (!result || typeof result !== "object" || !("product" in result) || !Array.isArray((result as ProductDetails).audit)) {
        throw new Error("The product details response was invalid.");
      }
      setDetails(result as ProductDetails);
      setEditName((result as ProductDetails).product.name);
      setEditDescription((result as ProductDetails).product.description);
      setEditCategory((result as ProductDetails).product.category ?? "");
      setEditPricingModel((result as ProductDetails).product.pricingModel ?? "");
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product details could not be loaded.");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial: Filters = {
      q: params.get("q") ?? "",
      category: params.get("category") ?? "",
      developerId: params.get("developerId") ?? "",
      status: params.get("status") ?? "ALL",
      approval: params.get("approval") ?? "ALL",
      createdFrom: params.get("createdFrom") ?? "",
      createdTo: params.get("createdTo") ?? "",
      sort: params.get("sort") ?? "createdAt",
      order: params.get("order") ?? "desc",
    };
    const requestedPage = Number(params.get("page") ?? "1");
    const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    setFilters(initial);
    setApiBaseUrl(`${window.location.origin}/api`);
    void load(safePage, initial);
  }, [load]);

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load(1, filters);
  }

  async function submitProductAction(product: Product, action: "APPROVE" | "ACTIVATE" | "DEACTIVATE" | "SUSPEND", confirmation: string) {
    if (!window.confirm(confirmation)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/platform/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Product status could not be updated.";
        throw new Error(message);
      }
      await load(page, appliedFilters);
      if (details?.product.id === product.id) await loadDetails(product.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function rejectProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || !rejectionReason.trim() || !window.confirm("Reject this API product submission?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/platform/products/${encodeURIComponent(details.product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", reason: rejectionReason }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Product could not be rejected.";
        throw new Error(message);
      }
      setRejectingProductId("");
      setRejectionReason("");
      await load(page, appliedFilters);
      await loadDetails(details.product.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product could not be rejected.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/platform/products/${encodeURIComponent(details.product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName, description: editDescription,
          category: editCategory || null, pricingModel: editPricingModel || null,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Product metadata could not be saved.";
        throw new Error(message);
      }
      setEditing(false);
      await load(page, appliedFilters);
      await loadDetails(details.product.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product metadata could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const summary = inventory?.summary;
  return <main className="api-platform-shell">
    <header className="api-platform-header">
      <a href="/super-admin">LIFE · Super Admin</a>
      <nav className="api-platform-links" aria-label="Super Admin API product navigation">
        <a href="/super-admin">Administration</a><a href="/super-admin/api">API management</a><a href="/api/docs">API documentation</a>
      </nav>
    </header>
    <div className="api-platform-content api-product-admin">
      <p className="super-admin-eyebrow">LIFE · API GOVERNANCE</p>
      <h1>API Products</h1>
      <p className="api-platform-note">Review developer submissions, manage product status, and inspect current-month usage and product audit history. Pricing information is descriptive only; LIFE does not process payments.</p>
      {error && <p className="api-platform-error" role="alert">{error}</p>}

      <section className="api-product-summary" aria-label="API product summary">
        {[
          ["Total API products", summary?.totalProducts],
          ["Active products", summary?.activeProducts],
          ["Pending approval", summary?.pendingApproval],
          ["Rejected products", summary?.rejectedProducts],
          ["Inactive products", summary?.inactiveProducts],
          ["Total developers", summary?.totalDevelopers],
          ["Total API requests", summary?.totalApiRequests],
        ].map(([label, value]) => <article key={label as string}><span>{label}</span><strong>{loading && value === undefined ? "…" : Number(value ?? 0).toLocaleString()}</strong></article>)}
      </section>

      <section className="api-platform-section">
        <h2>Search and filter</h2>
        <form className="api-product-filter-form" onSubmit={(event) => void applyFilters(event)}>
          <label>Product or developer search<input aria-label="Search product or developer" maxLength={100} value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Name, ID, or developer name" /></label>
          <label>Category<input aria-label="Filter by category" maxLength={60} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} /></label>
          <label>Developer ID<input aria-label="Filter by developer ID" maxLength={100} value={filters.developerId} onChange={(event) => setFilters({ ...filters, developerId: event.target.value })} /></label>
          <label>Product status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="ALL">All statuses</option>{["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "REJECTED", "INACTIVE", "SUSPENDED"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <label>Approval status<select value={filters.approval} onChange={(event) => setFilters({ ...filters, approval: event.target.value })}><option value="ALL">All approvals</option><option value="NOT_SUBMITTED">Not submitted</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
          <label>Created from<input type="date" value={filters.createdFrom} onChange={(event) => setFilters({ ...filters, createdFrom: event.target.value })} /></label>
          <label>Created to<input type="date" value={filters.createdTo} onChange={(event) => setFilters({ ...filters, createdTo: event.target.value })} /></label>
          <label>Sort by<select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="name">Name</option><option value="createdAt">Creation date</option><option value="usage">Usage</option></select></label>
          <label>Order<select value={filters.order} onChange={(event) => setFilters({ ...filters, order: event.target.value })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
          <div className="api-platform-actions api-product-filter-actions"><button className="api-platform-button" type="submit" disabled={loading}>Apply filters</button><button className="api-platform-button secondary" type="button" onClick={() => { setFilters(emptyFilters); void load(1, emptyFilters); }}>Clear</button></div>
        </form>
      </section>

      <section className="api-platform-section">
        <h2>Product inventory</h2>
        {loading ? <p aria-live="polite">Loading product inventory…</p> : inventory?.products.length ? <div className="api-platform-table-wrap"><table className="api-platform-table api-product-table">
          <thead><tr><th>Product ID</th><th>Product name</th><th>Developer name / ID</th><th>Category</th><th>API base URL</th><th>API version</th><th>Authentication</th><th>Pricing model</th><th>Requests (tracked / this month)</th><th>Product status</th><th>Approval status</th><th>Created</th><th>Last updated</th><th>Actions</th></tr></thead>
          <tbody>{inventory.products.map((product) => <tr key={product.id}>
            <td><code>{product.id}</code></td><td>{product.name}<br /><code>{product.slug}</code></td>
            <td>{product.developer?.fullName || product.developer?.email || "LIFE system product"}<br /><code>{product.developerUserId ?? "—"}</code></td>
            <td>{product.category || "Not specified"}</td><td>{apiBaseUrl}</td><td>{inventory.platform.apiVersion}</td>
            <td>{inventory.platform.authenticationType}</td><td>{product.pricingModel || "Not configured"}</td>
            <td>{product.totalRequests.toLocaleString()} / {product.currentMonthRequests.toLocaleString()}</td><td>{statusLabel(product.status)}</td><td>{statusLabel(product.approvalStatus)}</td>
            <td>{new Date(product.createdAt).toLocaleString()}</td><td>{new Date(product.updatedAt).toLocaleString()}</td>
            <td><div className="api-platform-actions api-product-row-actions">
              <button className="api-platform-button secondary" type="button" onClick={() => void loadDetails(product.id)}>View</button>
              {["DRAFT", "PENDING_APPROVAL", "REJECTED", "SUSPENDED"].includes(product.status) && <button className="api-platform-button secondary" type="button" disabled={saving} onClick={() => void submitProductAction(product, "APPROVE", `Approve ${product.name} for activation?`)}>Approve</button>}
              {product.status === "PENDING_APPROVAL" && <button className="api-platform-button danger" type="button" disabled={saving} onClick={() => { setDetails(null); setRejectionReason(""); setRejectingProductId(product.id); void loadDetails(product.id); }}>Reject</button>}
              {(product.status === "APPROVED" || product.status === "INACTIVE") && <button className="api-platform-button secondary" type="button" disabled={saving} onClick={() => void submitProductAction(product, "ACTIVATE", `Activate ${product.name}?`)}>Activate</button>}
              {product.status === "ACTIVE" && <><button className="api-platform-button secondary" type="button" disabled={saving} onClick={() => void submitProductAction(product, "DEACTIVATE", `Deactivate ${product.name}?`)}>Deactivate</button><button className="api-platform-button danger" type="button" disabled={saving} onClick={() => void submitProductAction(product, "SUSPEND", `Suspend ${product.name}?`)}>Suspend</button></>}
              {(product.status === "INACTIVE" || product.status === "APPROVED") && <button className="api-platform-button danger" type="button" disabled={saving} onClick={() => void submitProductAction(product, "SUSPEND", `Suspend ${product.name}?`)}>Suspend</button>}
            </div></td>
          </tr>)}</tbody>
        </table></div> : <p>No API products match these filters.</p>}
        <div className="api-product-pagination" aria-label="Product inventory pagination">
          <span>{inventory ? `${inventory.total.toLocaleString()} matching products · Page ${inventory.page} of ${Math.max(inventory.pageCount, 1)}` : " "}</span>
          <div className="api-platform-actions">
            <button className="api-platform-button secondary" type="button" disabled={!inventory || page <= 1 || loading} onClick={() => void load(page - 1, appliedFilters)}>Previous</button>
            <button className="api-platform-button secondary" type="button" disabled={!inventory || page >= inventory.pageCount || loading} onClick={() => void load(page + 1, appliedFilters)}>Next</button>
          </div>
        </div>
      </section>

      {detailsLoading && <p aria-live="polite">Loading product details…</p>}
      {details && !detailsLoading && <section className="api-platform-section api-product-details">
        <div className="api-platform-actions"><h2>Product details</h2><button className="api-platform-button secondary" type="button" onClick={() => { setDetails(null); setEditing(false); setRejectingProductId(""); }}>Close details</button></div>
        <div className="api-product-detail-grid">
          <div><span>Product ID</span><code>{details.product.id}</code></div><div><span>Product name</span><strong>{details.product.name}</strong></div>
          <div><span>Developer</span><strong>{details.product.developer?.fullName || "Name not provided"}</strong><code>{details.product.developer?.email ?? "LIFE system product"} · {details.product.developerUserId ?? "—"}</code></div>
          <div><span>API base URL</span><code>{apiBaseUrl}</code></div><div><span>API version</span><strong>{details.apiVersion}</strong></div>
          <div><span>Authentication</span><strong>{details.authenticationType}</strong></div><div><span>Pricing model</span><strong>{details.product.pricingModel || "Not configured"}</strong></div>
          <div><span>Total tracked / this month</span><strong>{details.totalRequests.toLocaleString()} / {details.currentMonthRequests.toLocaleString()} requests</strong></div>
          <div><span>Default limits</span><strong>{details.product.defaultRequestsPerMinute}/min · {details.product.defaultDailyQuota}/day · {details.product.defaultMonthlyQuota}/month</strong></div>
          <div><span>Created / updated</span><strong>{new Date(details.product.createdAt).toLocaleString()} / {new Date(details.product.updatedAt).toLocaleString()}</strong></div>
        </div>
        <h3>Product description</h3><p>{details.product.description}</p>
        <h3>Endpoints</h3><ul>{details.product.endpoints.map((endpoint) => <li key={endpoint}><code>{endpoint}</code></li>)}</ul>
        <p><a href={details.documentationPath}>API documentation reference</a></p>
        {details.product.rejectionReason && <p className="api-platform-error"><strong>Rejection reason:</strong> {details.product.rejectionReason}</p>}
        <div className="api-platform-actions">
          <button className="api-platform-button secondary" type="button" onClick={() => setEditing(!editing)}>{editing ? "Cancel edit" : "Edit permitted metadata"}</button>
          {details.product.status === "PENDING_APPROVAL" && <button className="api-platform-button danger" type="button" onClick={() => { const next = rejectingProductId === details.product.id ? "" : details.product.id; setRejectingProductId(next); setRejectionReason(""); }}>{rejectingProductId === details.product.id ? "Cancel rejection" : "Reject submission"}</button>}
        </div>
        {editing && <form className="api-platform-form api-product-edit-form" onSubmit={(event) => void saveMetadata(event)}>
          <label>Name<input required maxLength={100} value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
          <label>Category<input maxLength={60} value={editCategory} onChange={(event) => setEditCategory(event.target.value)} /></label>
          <label className="api-platform-wide">Description<textarea maxLength={500} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label>
          <label>Pricing model<input maxLength={80} value={editPricingModel} onChange={(event) => setEditPricingModel(event.target.value)} /></label>
          <button className="api-platform-button" type="submit" disabled={saving}>Save metadata</button>
        </form>}
        {rejectingProductId === details.product.id && details.product.status === "PENDING_APPROVAL" && <form className="api-platform-form api-product-edit-form" onSubmit={(event) => void rejectProduct(event)}>
          <label className="api-platform-wide">Rejection reason<textarea required maxLength={1000} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label>
          <button className="api-platform-button danger" type="submit" disabled={saving || !rejectionReason.trim()}>Confirm rejection</button>
        </form>}
        <h3>Creation, approval, and audit history</h3>
        {details.audit.length ? <div className="api-platform-table-wrap"><table className="api-platform-table"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead><tbody>{details.audit.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString()}</td><td>{event.action}</td><td>{event.actor.email}<br /><code>{event.actor.id}</code></td><td><code>{JSON.stringify(event.details)}</code></td></tr>)}</tbody></table></div> : <p>No audit events are recorded for this product.</p>}
      </section>}
    </div>
  </main>;
}
