"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "DEVELOPER" | "ADMIN" | "SUPER_ADMIN";
type Product = { id: string; slug: string; name: string; description: string; endpoints: string[]; defaultRequestsPerMinute: number; defaultDailyQuota: number; defaultMonthlyQuota: number; enabled: boolean };
type Account = { id: string; email: string; fullName: string | null };
type Grant = { id: string; accountUserId: string; productId: string; scopes: string[]; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; enabled: boolean; account: Account; product: Product };
type AdminPermission = { id: string; adminUserId: string; productId: string; scopes: string[]; maxRequestsPerMinute: number; maxDailyQuota: number; maxMonthlyQuota: number; canManageAccess: boolean; enabled: boolean; admin: Account; product: Product };
type ApiKey = { id: string; keyId: string; prefix: string; label: string; ownerUserId: string; productId: string; scopes: string[]; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; status: "ACTIVE" | "DISABLED" | "REVOKED"; expiresAt: string | null; lastUsedAt: string | null; createdAt: string; product: Pick<Product, "id" | "name" | "slug">; owner: Pick<Account, "id" | "email">; usage: { requestCount: number; errorCount: number }; accountUsage: { requestCount: number; errorCount: number } };

const endpointOptions = [
  "GET /api/health",
  "GET /api/locations",
  "POST /api/charts",
  "POST /api/transits",
  "GET /api/developer/test",
];
const asArray = <T,>(value: unknown, key: string): T[] => {
  if (!value || typeof value !== "object" || !Array.isArray((value as Record<string, unknown>)[key])) throw new Error("The API platform response was invalid.");
  return (value as Record<string, unknown>)[key] as T[];
};

function ProductScopes({ product, scopes, onChange }: { product?: Product; scopes: string[]; onChange(value: string[]): void }) {
  const options = product?.endpoints ?? endpointOptions;
  return <div className="api-platform-scope-list api-platform-wide" aria-label="Permitted API endpoints">
    {options.map((endpoint) => <label key={endpoint}><input type="checkbox" checked={scopes.includes(endpoint)} onChange={(event) => onChange(event.target.checked ? [...scopes, endpoint] : scopes.filter((scope) => scope !== endpoint))} />{endpoint}</label>)}
  </div>;
}

export default function ApiPlatformDashboard({ role, userId, email }: { role: Role; userId: string; email: string }) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role !== "DEVELOPER";
  const [products, setProducts] = useState<Product[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<Account[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(role === "DEVELOPER" ? userId : "");
  const [scopes, setScopes] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [requestsPerMinute, setRequestsPerMinute] = useState("30");
  const [dailyQuota, setDailyQuota] = useState("1000");
  const [monthlyQuota, setMonthlyQuota] = useState("30000");
  const [expiresAt, setExpiresAt] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [productDraft, setProductDraft] = useState({ slug: "", name: "", description: "", endpoints: ["GET /api/health", "GET /api/developer/test"], rpm: "30", daily: "1000", monthly: "30000" });
  const [editingProductId, setEditingProductId] = useState("");
  const [grantDraft, setGrantDraft] = useState({ accountUserId: "", productId: "", scopes: [] as string[], rpm: "30", daily: "1000", monthly: "30000", enabled: true });
  const [permissionDraft, setPermissionDraft] = useState({ adminUserId: "", productId: "", scopes: [] as string[], rpm: "30", daily: "1000", monthly: "30000", canManageAccess: true, enabled: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all([
        fetch("/api/platform/products", { cache: "no-store" }),
        fetch("/api/platform/keys", { cache: "no-store" }),
        fetch("/api/platform/grants", { cache: "no-store" }),
        ...(isAdmin ? [
          fetch("/api/platform/accounts", { cache: "no-store" }),
          fetch("/api/platform/permissions", { cache: "no-store" }),
        ] : []),
        ...(isSuperAdmin ? [fetch("/api/platform/accounts?role=ADMIN", { cache: "no-store" })] : []),
      ]);
      const payloads = await Promise.all(results.map(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "The API platform could not be loaded.");
        return body;
      }));
      setProducts(asArray<Product>(payloads[0], "products"));
      setKeys(asArray<ApiKey>(payloads[1], "keys"));
      setGrants(asArray<Grant>(payloads[2], "grants"));
      let offset = 3;
      if (isAdmin) {
        setAccounts(asArray<Account>(payloads[offset], "accounts"));
        offset += 1;
        const permissionRecords = asArray<AdminPermission>(payloads[offset], "permissions");
        setPermissions(permissionRecords);
        offset += 1;
      }
      if (isSuperAdmin) setAdminAccounts(asArray<Account>(payloads[offset], "accounts"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The API platform could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSuperAdmin]);

  useEffect(() => { void load(); }, [load]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedGrant = grants.find((grant) => grant.productId === selectedProductId && grant.accountUserId === selectedAccountId && grant.enabled);
  const selectedAdminPermission = permissions.find((permission) => permission.productId === selectedProductId && permission.enabled && permission.canManageAccess);
  const grantedEndpoints = selectedGrant?.scopes ?? [];
  const permittedEndpoints = role === "ADMIN"
    ? grantedEndpoints.filter((scope) => selectedAdminPermission?.scopes.includes(scope))
    : grantedEndpoints;
  const keyProduct = selectedProduct ? { ...selectedProduct, endpoints: permittedEndpoints } : undefined;
  const keyLimits = {
    rpm: Math.min(selectedGrant?.requestsPerMinute ?? selectedProduct?.defaultRequestsPerMinute ?? 600, role === "ADMIN" ? selectedAdminPermission?.maxRequestsPerMinute ?? 0 : 600),
    daily: Math.min(selectedGrant?.dailyQuota ?? selectedProduct?.defaultDailyQuota ?? 1_000_000, role === "ADMIN" ? selectedAdminPermission?.maxDailyQuota ?? 0 : 1_000_000),
    monthly: Math.min(selectedGrant?.monthlyQuota ?? selectedProduct?.defaultMonthlyQuota ?? 10_000_000, role === "ADMIN" ? selectedAdminPermission?.maxMonthlyQuota ?? 0 : 10_000_000),
  };
  const visibleKeys = useMemo(() => keys.filter((key) =>
    (filterStatus === "ALL" || key.status === filterStatus)
    && (filterProduct === "ALL" || key.productId === filterProduct)
    && `${key.label} ${key.owner.email} ${key.product.name}`.toLowerCase().includes(filterText.toLowerCase()),
  ), [filterStatus, filterProduct, filterText, keys]);

  useEffect(() => {
    if (!selectedProduct) return;
    const grantScopes = grants.find((grant) => grant.productId === selectedProduct.id && grant.accountUserId === selectedAccountId && grant.enabled)?.scopes ?? [];
    const permitted = role === "ADMIN"
      ? grantScopes.filter((scope) => selectedAdminPermission?.scopes.includes(scope))
      : grantScopes;
    setScopes((current) => current.filter((scope) => permitted.includes(scope)));
    const grant = grants.find((item) => item.productId === selectedProduct.id && item.accountUserId === selectedAccountId && item.enabled);
    const requestMaximum = role === "ADMIN" ? Math.min(grant?.requestsPerMinute ?? selectedProduct.defaultRequestsPerMinute, selectedAdminPermission?.maxRequestsPerMinute ?? 0) : grant?.requestsPerMinute ?? selectedProduct.defaultRequestsPerMinute;
    const dailyMaximum = role === "ADMIN" ? Math.min(grant?.dailyQuota ?? selectedProduct.defaultDailyQuota, selectedAdminPermission?.maxDailyQuota ?? 0) : grant?.dailyQuota ?? selectedProduct.defaultDailyQuota;
    const monthlyMaximum = role === "ADMIN" ? Math.min(grant?.monthlyQuota ?? selectedProduct.defaultMonthlyQuota, selectedAdminPermission?.maxMonthlyQuota ?? 0) : grant?.monthlyQuota ?? selectedProduct.defaultMonthlyQuota;
    setRequestsPerMinute(String(requestMaximum));
    setDailyQuota(String(dailyMaximum));
    setMonthlyQuota(String(monthlyMaximum));
  }, [selectedProductId, selectedAccountId, products, grants, permissions, selectedAdminPermission, role, userId]);

  async function submitJson(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
    return result;
  }

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice(""); setOneTimeSecret("");
    try {
      const result = await submitJson("/api/platform/keys", "POST", {
        ownerUserId: selectedAccountId, productId: selectedProductId, label, scopes,
        requestsPerMinute: Number(requestsPerMinute), dailyQuota: Number(dailyQuota), monthlyQuota: Number(monthlyQuota),
        expiresAt: expiresAt || null,
      });
      setOneTimeSecret(result.secret);
      setNotice("API key created. Copy the secret now; it cannot be displayed again.");
      setLabel("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "API key could not be created.");
    } finally { setSaving(false); }
  }

  async function changeKey(key: ApiKey, action: "ACTIVE" | "DISABLED" | "REVOKE" | "ROTATE") {
    if (action === "REVOKE" && !window.confirm(`Revoke API key ${key.label}? Existing clients will stop authenticating.`)) return;
    setError(""); setNotice(""); setOneTimeSecret("");
    try {
      if (action === "ROTATE") {
        const result = await submitJson(`/api/platform/keys/${encodeURIComponent(key.keyId)}`, "POST", {});
        setOneTimeSecret(result.secret); setNotice("Key rotated. Copy the new secret now; the old key has been revoked.");
      } else if (action === "REVOKE") {
        await submitJson(`/api/platform/keys/${encodeURIComponent(key.keyId)}`, "DELETE", {});
        setNotice("API key revoked.");
      } else {
        await submitJson(`/api/platform/keys/${encodeURIComponent(key.keyId)}`, "PATCH", { status: action });
        setNotice(`API key ${action.toLowerCase()}.`);
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "API key action failed.");
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await submitJson(editingProductId ? `/api/platform/products/${editingProductId}` : "/api/platform/products", editingProductId ? "PATCH" : "POST", {
        slug: productDraft.slug, name: productDraft.name, description: productDraft.description,
        endpoints: productDraft.endpoints, defaultRequestsPerMinute: Number(productDraft.rpm),
        defaultDailyQuota: Number(productDraft.daily), defaultMonthlyQuota: Number(productDraft.monthly),
      });
      setNotice(editingProductId ? "API product updated." : "API product created.");
      setEditingProductId("");
      setProductDraft({ slug: "", name: "", description: "", endpoints: ["GET /api/health", "GET /api/developer/test"], rpm: "30", daily: "1000", monthly: "30000" });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Product could not be saved."); }
    finally { setSaving(false); }
  }

  async function assignGrant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await submitJson("/api/platform/grants", "POST", {
        ...grantDraft, requestsPerMinute: Number(grantDraft.rpm), dailyQuota: Number(grantDraft.daily),
        monthlyQuota: Number(grantDraft.monthly),
      });
      setNotice("Developer access grant saved."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Access could not be assigned."); }
    finally { setSaving(false); }
  }

  async function assignAdminPermission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await submitJson("/api/platform/permissions", "POST", {
        adminUserId: permissionDraft.adminUserId, productId: permissionDraft.productId, scopes: permissionDraft.scopes,
        maxRequestsPerMinute: Number(permissionDraft.rpm), maxDailyQuota: Number(permissionDraft.daily),
        maxMonthlyQuota: Number(permissionDraft.monthly), canManageAccess: permissionDraft.canManageAccess, enabled: permissionDraft.enabled,
      });
      setNotice("Admin API permissions saved."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Admin permissions could not be saved."); }
    finally { setSaving(false); }
  }

  const grantProduct = products.find((product) => product.id === grantDraft.productId);
  const permissionProduct = products.find((product) => product.id === permissionDraft.productId);
  return <main className="api-platform-shell">
    <header className="api-platform-header"><a href="/">✳ LIFE</a><nav className="api-platform-links" aria-label="API platform navigation"><a href="/developers">Developer portal</a><a href="/api/docs">API documentation</a><a href="/">Home</a></nav></header>
    <div className="api-platform-content">
      <p className="super-admin-eyebrow">LIFE · API ACCESS</p>
      <h1>{role === "DEVELOPER" ? "Developer dashboard" : "API management"}</h1>
      <p className="api-platform-note">Signed in as {email} · {role}. Keys are shown only as safe prefixes after creation. Store each secret securely when it is first displayed.</p>
      {error && <p className="api-platform-error" role="alert">{error}</p>}
      {notice && <p className="api-platform-note" role="status">{notice}</p>}
      {oneTimeSecret && <section className="api-platform-alert" aria-label="One-time API key secret"><strong>Copy this secret now. It cannot be retrieved again.</strong><p><code>{oneTimeSecret}</code></p><button className="api-platform-button secondary" type="button" onClick={() => void navigator.clipboard.writeText(oneTimeSecret)}>Copy key</button></section>}

      <section className="api-platform-section"><h2>API products</h2>{loading ? <p aria-live="polite">Loading products…</p> : products.length === 0 ? <p>No API products are configured. A Super Admin must enable a product and grant developer access.</p> : <div className="api-platform-table-wrap"><table className="api-platform-table"><thead><tr><th>Product</th><th>Description</th><th>Allowed endpoints</th><th>Default limits</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}<br /><code>{product.slug}</code></td><td>{product.description}</td><td>{product.endpoints.map((endpoint) => <div key={endpoint}><code>{endpoint}</code></div>)}</td><td>{product.defaultRequestsPerMinute}/min · {product.defaultDailyQuota}/day · {product.defaultMonthlyQuota}/month</td><td>{product.enabled ? "Enabled" : "Disabled"}{isSuperAdmin && <div className="api-platform-actions"><button className="api-platform-button secondary" type="button" onClick={() => { setEditingProductId(product.id); setProductDraft({ slug: product.slug, name: product.name, description: product.description, endpoints: [...product.endpoints], rpm: String(product.defaultRequestsPerMinute), daily: String(product.defaultDailyQuota), monthly: String(product.defaultMonthlyQuota) }); }}>{editingProductId === product.id ? "Editing" : "Edit"}</button><button className="api-platform-button secondary" type="button" onClick={async () => { try { await submitJson(`/api/platform/products/${product.id}`, "PATCH", { enabled: !product.enabled }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Product update failed."); } }}>{product.enabled ? "Disable" : "Enable"}</button></div>}</td></tr>)}</tbody></table></div>}</section>

      {isSuperAdmin && <section className="api-platform-section"><h2>{editingProductId ? "Edit API product" : "Create API product"}</h2><form className="api-platform-form" onSubmit={createProduct}>
        <label>Slug<input required maxLength={60} pattern="[a-z0-9-]{2,60}" disabled={Boolean(editingProductId)} value={productDraft.slug} onChange={(e) => setProductDraft({ ...productDraft, slug: e.target.value })} /></label>
        <label>Name<input required maxLength={100} value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} /></label>
        <label className="api-platform-wide">Description<input required maxLength={500} value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} /></label>
        <ProductScopes scopes={productDraft.endpoints} onChange={(value) => setProductDraft({ ...productDraft, endpoints: value })} />
        <label>Requests / minute<input type="number" min="1" max="600" value={productDraft.rpm} onChange={(e) => setProductDraft({ ...productDraft, rpm: e.target.value })} /></label>
        <label>Daily quota<input type="number" min="1" max="1000000" value={productDraft.daily} onChange={(e) => setProductDraft({ ...productDraft, daily: e.target.value })} /></label>
        <label>Monthly quota<input type="number" min="1" max="10000000" value={productDraft.monthly} onChange={(e) => setProductDraft({ ...productDraft, monthly: e.target.value })} /></label>
        <div className="api-platform-actions api-platform-wide"><button className="api-platform-button" disabled={saving}>{editingProductId ? "Save product" : "Create product"}</button>{editingProductId && <button className="api-platform-button secondary" type="button" onClick={() => { setEditingProductId(""); setProductDraft({ slug: "", name: "", description: "", endpoints: ["GET /api/health", "GET /api/developer/test"], rpm: "30", daily: "1000", monthly: "30000" }); }}>Cancel editing</button>}</div>
      </form></section>}

      {isSuperAdmin && <section className="api-platform-section"><h2>Assign developer API access</h2><form className="api-platform-form" onSubmit={assignGrant}>
        <label>Developer account<select required value={grantDraft.accountUserId} onChange={(e) => setGrantDraft({ ...grantDraft, accountUserId: e.target.value })}><option value="">Select developer</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.email}</option>)}</select></label>
        <label>Product<select required value={grantDraft.productId} onChange={(e) => { const p=products.find((item)=>item.id===e.target.value); setGrantDraft({ ...grantDraft, productId:e.target.value, scopes:p?.endpoints??[] }); }}><option value="">Select product</option>{products.filter((item)=>item.enabled).map((product)=><option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <ProductScopes product={grantProduct} scopes={grantDraft.scopes} onChange={(value)=>setGrantDraft({...grantDraft,scopes:value})}/>
        <label>Requests / minute<input type="number" min="1" max={grantProduct?.defaultRequestsPerMinute??600} value={grantDraft.rpm} onChange={(e)=>setGrantDraft({...grantDraft,rpm:e.target.value})}/></label>
        <label>Daily quota<input type="number" min="1" max={grantProduct?.defaultDailyQuota??1000000} value={grantDraft.daily} onChange={(e)=>setGrantDraft({...grantDraft,daily:e.target.value})}/></label>
        <label>Monthly quota<input type="number" min="1" max={grantProduct?.defaultMonthlyQuota??10000000} value={grantDraft.monthly} onChange={(e)=>setGrantDraft({...grantDraft,monthly:e.target.value})}/></label>
        <label><input type="checkbox" checked={grantDraft.enabled} onChange={(e)=>setGrantDraft({...grantDraft,enabled:e.target.checked})}/> Access enabled</label>
        <button className="api-platform-button" disabled={saving}>Save access grant</button>
      </form></section>}

      <section className="api-platform-section"><h2>Developer account grants</h2>{grants.length === 0 ? <p>No developer account grants are available to this role.</p> : <div className="api-platform-table-wrap"><table className="api-platform-table"><thead><tr><th>Developer</th><th>Product</th><th>Scopes</th><th>Limits</th><th>Status</th></tr></thead><tbody>{grants.map((grant) => <tr key={grant.id}><td>{grant.account.email}</td><td>{grant.product.name}</td><td>{grant.scopes.map((scope) => <div key={scope}><code>{scope}</code></div>)}</td><td>{grant.requestsPerMinute}/min · {grant.dailyQuota}/day · {grant.monthlyQuota}/month</td><td>{grant.enabled ? "Enabled" : "Disabled"}</td></tr>)}</tbody></table></div>}</section>

      {isSuperAdmin && <section className="api-platform-section"><h2>Grant scoped API authority to an Admin</h2><form className="api-platform-form" onSubmit={assignAdminPermission}>
        <label>Admin account<select required value={permissionDraft.adminUserId} onChange={(e)=>setPermissionDraft({...permissionDraft,adminUserId:e.target.value})}><option value="">Select Admin</option>{adminAccounts.map((account)=><option value={account.id} key={account.id}>{account.email}</option>)}</select></label>
        <label>Product<select required value={permissionDraft.productId} onChange={(e)=>{const p=products.find((item)=>item.id===e.target.value);setPermissionDraft({...permissionDraft,productId:e.target.value,scopes:p?.endpoints??[]})}}><option value="">Select product</option>{products.filter((item)=>item.enabled).map((product)=><option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <ProductScopes product={permissionProduct} scopes={permissionDraft.scopes} onChange={(value)=>setPermissionDraft({...permissionDraft,scopes:value})}/>
        <label>Max requests / minute<input type="number" min="1" max={permissionProduct?.defaultRequestsPerMinute??600} value={permissionDraft.rpm} onChange={(e)=>setPermissionDraft({...permissionDraft,rpm:e.target.value})}/></label>
        <label>Max daily quota<input type="number" min="1" max={permissionProduct?.defaultDailyQuota??1000000} value={permissionDraft.daily} onChange={(e)=>setPermissionDraft({...permissionDraft,daily:e.target.value})}/></label>
        <label>Max monthly quota<input type="number" min="1" max={permissionProduct?.defaultMonthlyQuota??10000000} value={permissionDraft.monthly} onChange={(e)=>setPermissionDraft({...permissionDraft,monthly:e.target.value})}/></label>
        <label><input type="checkbox" checked={permissionDraft.canManageAccess} onChange={(e)=>setPermissionDraft({...permissionDraft,canManageAccess:e.target.checked})}/> Allow API key access management</label>
        <label><input type="checkbox" checked={permissionDraft.enabled} onChange={(e)=>setPermissionDraft({...permissionDraft,enabled:e.target.checked})}/> Permission enabled</label>
        <button className="api-platform-button" disabled={saving}>Save Admin permission</button>
      </form></section>}

      {isSuperAdmin && <section className="api-platform-section"><h2>Admin API permissions</h2>{permissions.length === 0 ? <p>No Admin API permissions are configured.</p> : <div className="api-platform-table-wrap"><table className="api-platform-table"><thead><tr><th>Admin</th><th>Product</th><th>Scopes</th><th>Maximum limits</th><th>Access management</th><th>Status</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.id}><td>{permission.admin.email}</td><td>{permission.product.name}</td><td>{permission.scopes.map((scope) => <div key={scope}><code>{scope}</code></div>)}</td><td>{permission.maxRequestsPerMinute}/min · {permission.maxDailyQuota}/day · {permission.maxMonthlyQuota}/month</td><td>{permission.canManageAccess ? "Allowed" : "Not allowed"}</td><td>{permission.enabled ? "Enabled" : "Disabled"}</td></tr>)}</tbody></table></div>}</section>}

      <section className="api-platform-section"><h2>{isAdmin ? "Create an API key for an authorized developer" : "Create an API key"}</h2>
        {isAdmin && grants.length === 0 && <p>No access grants are available to this account. Super Admin must assign developer access and Admin product permissions first.</p>}
        <form className="api-platform-form" onSubmit={createKey}>
          {isAdmin && <label>Developer account<select required value={selectedAccountId} onChange={(e)=>setSelectedAccountId(e.target.value)}><option value="">Select account</option>{accounts.map((account)=><option value={account.id} key={account.id}>{account.email}</option>)}</select></label>}
          <label>Product<select required value={selectedProductId} onChange={(e)=>setSelectedProductId(e.target.value)}><option value="">Select product</option>{products.filter((product)=>product.enabled && grants.some((grant)=>grant.productId===product.id && grant.accountUserId===selectedAccountId && grant.enabled)).map((product)=><option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
          <label>Key label<input required maxLength={100} value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="e.g. Local integration" /></label>
          <label>Expires (optional)<input type="datetime-local" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} /></label>
          <ProductScopes product={keyProduct} scopes={scopes} onChange={setScopes}/>
          <label>Requests / minute<input type="number" min="1" max={keyLimits.rpm} value={requestsPerMinute} onChange={(e)=>setRequestsPerMinute(e.target.value)} /></label>
          <label>Daily quota<input type="number" min="1" max={keyLimits.daily} value={dailyQuota} onChange={(e)=>setDailyQuota(e.target.value)} /></label>
          <label>Monthly quota<input type="number" min="1" max={keyLimits.monthly} value={monthlyQuota} onChange={(e)=>setMonthlyQuota(e.target.value)} /></label>
          <button className="api-platform-button" disabled={saving || !selectedProduct || !selectedGrant || scopes.length===0}>Create and show once</button>
        </form>
      </section>

      <section className="api-platform-section"><div className="api-platform-actions"><h2>API keys and monthly usage</h2>{isAdmin&&<a className="api-platform-button secondary" href="/api/platform/usage">Export safe CSV</a>}</div>
        <div className="api-platform-filter"><input aria-label="Search API keys" placeholder="Search label or account" value={filterText} onChange={(e)=>setFilterText(e.target.value)}/><select aria-label="Filter by key status" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}><option value="ALL">All statuses</option><option>ACTIVE</option><option>DISABLED</option><option>REVOKED</option></select><select aria-label="Filter by product" value={filterProduct} onChange={(e)=>setFilterProduct(e.target.value)}><option value="ALL">All products</option>{products.map((product)=><option value={product.id} key={product.id}>{product.name}</option>)}</select></div>
        {loading?<p aria-live="polite">Loading API keys…</p>:visibleKeys.length===0?<p>No API keys match the current filters.</p>:<div className="api-platform-table-wrap"><table className="api-platform-table"><thead><tr><th>Key</th><th>Account</th><th>Product / scopes</th><th>Status / expiry</th><th>Usage this month</th><th>Last used</th><th>Actions</th></tr></thead><tbody>{visibleKeys.map((key)=><tr key={key.id}><td>{key.label}<br/><code>{key.prefix}…</code></td><td>{key.owner.email}</td><td>{key.product.name}<br/>{key.scopes.map((scope)=><div key={scope}><code>{scope}</code></div>)}</td><td>{key.status}<br/>{key.expiresAt?new Date(key.expiresAt).toLocaleString():"No expiry"}</td><td>Key: {key.usage.requestCount} requests · {key.usage.errorCount} errors<br/>Account: {key.accountUsage.requestCount} requests · {key.accountUsage.errorCount} errors</td><td>{key.lastUsedAt?new Date(key.lastUsedAt).toLocaleString():"Never"}</td><td><div className="api-platform-actions">{key.status!=="REVOKED"&&<><button className="api-platform-button secondary" onClick={()=>void changeKey(key,key.status==="ACTIVE"?"DISABLED":"ACTIVE")}>{key.status==="ACTIVE"?"Disable":"Enable"}</button><button className="api-platform-button secondary" onClick={()=>void changeKey(key,"ROTATE")}>Rotate</button><button className="api-platform-button danger" onClick={()=>void changeKey(key,"REVOKE")}>Revoke</button></>}</div></td></tr>)}</tbody></table></div>}
      </section>

      <section className="api-platform-section"><h2>Authenticated API test</h2><p>Use a key scoped to <code>GET /api/developer/test</code> to verify authentication, scopes and remaining quotas. Set BASE_URL to this deployment's HTTPS origin.</p><div className="api-platform-examples">
        <article className="api-platform-example"><strong>cURL</strong><pre><code>{`BASE_URL="https://your-deployment-host"\ncurl "$BASE_URL/api/developer/test" \\\n  -H "Authorization: Bearer <YOUR_ONE_TIME_KEY>"`}</code></pre></article>
        <article className="api-platform-example"><strong>JavaScript fetch</strong><pre><code>{`const BASE_URL = "https://your-deployment-host";\nconst response = await fetch(new URL("/api/developer/test", BASE_URL), {\n  headers: { Authorization: "Bearer <YOUR_ONE_TIME_KEY>" }\n});\nconst result = await response.json();`}</code></pre></article>
        <article className="api-platform-example"><strong>PHP</strong><pre><code>{`$baseUrl = 'https://your-deployment-host';\n$ch = curl_init(rtrim($baseUrl, '/') . '/api/developer/test');\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n  "Authorization: Bearer <YOUR_ONE_TIME_KEY>"\n]);\n$result = curl_exec($ch);`}</code></pre></article>
      </div><p className="api-platform-note">Errors: 401 invalid/missing/revoked/expired key; 403 insufficient scope; 429 rate or quota exceeded; 503 key service unavailable. Requests require HTTPS outside local development. Never put API keys in browser code or logs.</p><p><a href="/api/docs">Review actual endpoint schemas and documentation</a></p></section>
    </div>
  </main>;
}
