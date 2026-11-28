"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Product = { id: string; slug: string; name: string; status: string; enabled: boolean };
type PlanProduct = { productId: string; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number; product: Product };
type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  priceMinorUnits: string | null;
  currency: string | null;
  taxRateBasisPoints: number | null;
  periodDays: number | null;
  free: boolean;
  checkoutEnabled: boolean;
  products: PlanProduct[];
};
type Subscription = {
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceMinorUnits: string | null;
  currency: string | null;
  plan: Plan;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotalMinorUnits: string;
  taxMinorUnits: string;
  totalMinorUnits: string;
  currency: string;
  issuedAt: string;
  billingSnapshot: Record<string, unknown>;
  subscription: { plan: { name: string } };
  payment: { status: string; provider: string; isSandbox: boolean } | null;
};
type Payment = {
  id: string;
  status: string;
  amountMinorUnits: string;
  refundedAmountMinorUnits: string;
  currency: string;
  isSandbox: boolean;
  createdAt: string;
  refundReason: string | null;
  subscription: { id: string; developerUserId: string; plan: { id: string; name: string }; developer: { email: string; fullName: string | null } };
};
type PlanDraft = { slug: string; name: string; description: string; status: string; priceMinorUnits: string; currency: string; taxRateBasisPoints: string; periodDays: string };
type EntitlementDraft = { productId: string; requestsPerMinute: number; dailyQuota: number; monthlyQuota: number };

const blankPlan: PlanDraft = { slug: "", name: "", description: "", status: "DRAFT", priceMinorUnits: "", currency: "", taxRateBasisPoints: "", periodDays: "30" };

export default function ApiBillingDashboard({ superAdmin = false }: { superAdmin?: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenue, setRevenue] = useState<{ currency: string; realCollectedMinorUnits: string; sandboxSuccessfulMinorUnits: string; sandboxRefundedMinorUnits: string; sandboxPayments: number }[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<{ id: string; status: string; plan: { name: string }; payments: { id: string; status: string; amountMinorUnits: string; currency: string; isSandbox: boolean; createdAt: string }[] }[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [grandfathered, setGrandfathered] = useState(false);
  const [paymentMode, setPaymentMode] = useState("disabled");
  const [draft, setDraft] = useState<PlanDraft>(blankPlan);
  const [entitlements, setEntitlements] = useState<EntitlementDraft[]>([]);
  const [productChoice, setProductChoice] = useState("");
  const [requestsPerMinute, setRequestsPerMinute] = useState("30");
  const [dailyQuota, setDailyQuota] = useState("1000");
  const [monthlyQuota, setMonthlyQuota] = useState("30000");
  const [editingPlanId, setEditingPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (superAdmin) {
        const [planResponse, productResponse, billingResponse] = await Promise.all([
          fetch("/api/super-admin/api-plans", { cache: "no-store" }),
          fetch("/api/platform/products", { cache: "no-store" }),
          fetch("/api/super-admin/api-billing", { cache: "no-store" }),
        ]);
        const [planResult, productResult, billingResult] = await Promise.all([planResponse.json(), productResponse.json(), billingResponse.json()]);
        if (!planResponse.ok || !productResponse.ok || !billingResponse.ok) throw new Error(planResult.error || productResult.error || billingResult.error || "Billing data could not be loaded.");
        setPlans(planResult.plans);
        setProducts(productResult.products);
        setPayments(billingResult.payments);
        setRevenue(billingResult.revenueByCurrency);
        setPaymentMode(billingResult.paymentMode);
      } else {
        const [subscriptionResponse, invoiceResponse] = await Promise.all([
          fetch("/api/developer/subscription", { cache: "no-store" }),
          fetch("/api/developer/invoices", { cache: "no-store" }),
        ]);
        const [subscriptionResult, invoiceResult] = await Promise.all([subscriptionResponse.json(), invoiceResponse.json()]);
        if (!subscriptionResponse.ok || !invoiceResponse.ok) throw new Error(subscriptionResult.error || invoiceResult.error || "Subscription data could not be loaded.");
        setPlans(subscriptionResult.plans);
        setSubscription(subscriptionResult.currentSubscription);
        setHistory(subscriptionResult.subscriptions);
        setGrandfathered(subscriptionResult.grandfathered);
        setPaymentMode(subscriptionResult.paymentMode);
        setInvoices(invoiceResult.invoices);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Billing data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [superAdmin]);

  useEffect(() => { void load(); }, [load]);

  function editPlan(plan: Plan) {
    setEditingPlanId(plan.id);
    setDraft({
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      priceMinorUnits: plan.priceMinorUnits ?? "",
      currency: plan.currency ?? "",
      taxRateBasisPoints: plan.taxRateBasisPoints === null ? "" : String(plan.taxRateBasisPoints),
      periodDays: plan.periodDays === null ? "" : String(plan.periodDays),
    });
    setEntitlements(plan.products.map(({ productId, requestsPerMinute: rpm, dailyQuota: daily, monthlyQuota: monthly }) => ({
      productId, requestsPerMinute: rpm, dailyQuota: daily, monthlyQuota: monthly,
    })));
  }

  function addProduct() {
    if (!productChoice || entitlements.some((item) => item.productId === productChoice)) return;
    setEntitlements((old) => [...old, {
      productId: productChoice,
      requestsPerMinute: Number(requestsPerMinute),
      dailyQuota: Number(dailyQuota),
      monthlyQuota: Number(monthlyQuota),
    }]);
    setProductChoice("");
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const body = {
      ...draft,
      priceMinorUnits: draft.priceMinorUnits || null,
      currency: draft.currency.trim().toUpperCase() || null,
      taxRateBasisPoints: draft.taxRateBasisPoints === "" ? null : Number(draft.taxRateBasisPoints),
      periodDays: draft.periodDays === "" ? null : Number(draft.periodDays),
      products: entitlements,
    };
    try {
      const response = await fetch(editingPlanId ? `/api/super-admin/api-plans/${encodeURIComponent(editingPlanId)}` : "/api/super-admin/api-plans", {
        method: editingPlanId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Plan could not be saved.");
      setMessage(`Plan ${result.plan.name} saved.`);
      setDraft(blankPlan);
      setEntitlements([]);
      setEditingPlanId("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function enroll(plan: Plan) {
    if (!window.confirm(`${plan.free ? "Activate" : "Create sandbox checkout for"} ${plan.name}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/developer/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: history.length ? "renew" : "enroll",
          planId: plan.id,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Subscription could not be created.");
      setMessage(plan.free
        ? "Free plan activated. Your plan's product quotas are now applied."
        : "Sandbox checkout created. No real charge or revenue is recorded; access begins only after a mock provider confirmation.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Subscription could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    if (!subscription || !window.confirm(`Cancel ${subscription.plan.name} at the end of its current period?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/developer/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Subscription cancellation could not be scheduled.");
      setMessage("Cancellation is scheduled for the end of the current period.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Subscription cancellation could not be scheduled.");
    } finally {
      setBusy(false);
    }
  }

  async function refund(payment: Payment) {
    if (!window.confirm(`Refund sandbox payment ${payment.id} and suspend its subscription?`)) return;
    const reason = window.prompt("Enter the required refund reason:");
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/super-admin/api-payments/${encodeURIComponent(payment.id)}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Refund could not be completed.");
      setMessage("Mock provider confirmed the sandbox refund. No real money was moved.");
      await load();
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "Refund could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const activeProducts = products.filter((product) => product.enabled && product.status === "ACTIVE");
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;

  return <div className="super-admin-content">
    <nav className="api-ecosystem-nav" aria-label="API platform navigation">
      {superAdmin ? <><a href="/super-admin">Super Admin home</a><a href="/super-admin/api-products">Products</a><a href="/super-admin/developers">Developers</a><a href="/super-admin/api-analytics">Analytics</a></>
        : <><a href="/developers">Developer portal</a><a href="/developers/dashboard">Products & keys</a><a href="/developers/analytics">Usage analytics</a><a href="/api/docs">API docs</a></>}
    </nav>
    <p className="super-admin-eyebrow">API PLATFORM · BILLING</p>
    <h1>{superAdmin ? "API plans & billing" : "Plans & subscription"}</h1>
    <p className="super-admin-description">
      {superAdmin ? "Configure database-backed API plans and inspect payment, subscription and sandbox revenue records." : "Choose a configured plan, review your subscription and access your invoices."}
      {" "}Payment processing is mock-only; sandbox amounts are never real revenue.
    </p>
    {error && <div className="super-admin-error" role="alert"><p>{error}</p><button onClick={() => void load()} type="button">Retry</button></div>}
    {message && <p className="developer-admin-message" role="status">{message}</p>}
    {loading && <p className="super-admin-state" role="status">Loading plan and billing data…</p>}

    {superAdmin ? <>
      <section className="api-billing-section">
        <h2>Revenue and subscription summary</h2>
        <p>Real collected amounts are calculated only from non-sandbox successful payments. Mock payments are shown separately.</p>
        <div className="developers-table-wrap"><table className="developers-table">
          <thead><tr><th>Currency</th><th>Real collected</th><th>Sandbox successful</th><th>Sandbox refunded</th><th>Sandbox payments</th></tr></thead>
          <tbody>{revenue.map((row) => <tr key={row.currency}><td>{row.currency}</td><td>{row.realCollectedMinorUnits}</td><td>{row.sandboxSuccessfulMinorUnits}</td><td>{row.sandboxRefundedMinorUnits}</td><td>{row.sandboxPayments}</td></tr>)}
            {!revenue.length && <tr><td colSpan={5}>No payment records exist.</td></tr>}</tbody>
        </table></div>
        <p className="developers-note">Payment mode: {paymentMode}. Values are in currency minor units; no seeded prices or tax rates are present.</p>
      </section>

      <section className="api-billing-section">
        <h2>{editingPlanId ? "Edit plan" : "Create plan"}</h2>
        <form className="api-billing-form" onSubmit={(event) => void savePlan(event)}>
          <label>Slug<input required maxLength={60} pattern="[a-z0-9-]{2,60}" disabled={Boolean(editingPlanId)} value={draft.slug} onChange={(event) => setDraft((old) => ({ ...old, slug: event.target.value }))} /></label>
          <label>Plan name<input required maxLength={100} value={draft.name} onChange={(event) => setDraft((old) => ({ ...old, name: event.target.value }))} /></label>
          <label>Description<input required maxLength={1000} value={draft.description} onChange={(event) => setDraft((old) => ({ ...old, description: event.target.value }))} /></label>
          <label>Status<select value={draft.status} onChange={(event) => setDraft((old) => ({ ...old, status: event.target.value }))}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label>
          <label>Price (minor units)<input inputMode="numeric" value={draft.priceMinorUnits} onChange={(event) => setDraft((old) => ({ ...old, priceMinorUnits: event.target.value.replace(/\D/g, "") }))} placeholder="0 for free; blank for unconfigured" /></label>
          <label>Currency code<input maxLength={3} value={draft.currency} onChange={(event) => setDraft((old) => ({ ...old, currency: event.target.value.toUpperCase() }))} placeholder="Set explicitly, e.g. USD" /></label>
          <label>Tax rate (basis points)<input inputMode="numeric" value={draft.taxRateBasisPoints} onChange={(event) => setDraft((old) => ({ ...old, taxRateBasisPoints: event.target.value.replace(/\D/g, "") }))} placeholder="Set explicitly; 0 means no tax" /></label>
          <label>Period (days)<input inputMode="numeric" value={draft.periodDays} onChange={(event) => setDraft((old) => ({ ...old, periodDays: event.target.value.replace(/\D/g, "") }))} placeholder="Manual renewal period" /></label>
          <fieldset className="api-billing-products"><legend>Allowed active products and quotas</legend>
            <div className="api-billing-product-picker">
              <label>Product<select value={productChoice} onChange={(event) => setProductChoice(event.target.value)}><option value="">Select an active product</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              <label>Requests / minute<input type="number" min="1" max="600" value={requestsPerMinute} onChange={(event) => setRequestsPerMinute(event.target.value)} /></label>
              <label>Daily quota<input type="number" min="1" max="1000000" value={dailyQuota} onChange={(event) => setDailyQuota(event.target.value)} /></label>
              <label>Monthly quota<input type="number" min="1" max="10000000" value={monthlyQuota} onChange={(event) => setMonthlyQuota(event.target.value)} /></label>
              <button onClick={addProduct} type="button" disabled={!productChoice}>Add product</button>
            </div>
            <ul>{entitlements.map((item) => <li key={item.productId}>
              <span>{productName(item.productId)} · {item.requestsPerMinute}/min · {item.dailyQuota}/day · {item.monthlyQuota}/month</span>
              <button onClick={() => setEntitlements((old) => old.filter((candidate) => candidate.productId !== item.productId))} type="button">Remove</button>
            </li>)}
              {!entitlements.length && <li>No products are configured. Active plans require at least one approved, active product.</li>}
            </ul>
          </fieldset>
          <div className="api-billing-form-actions"><button disabled={busy} type="submit">{busy ? "Saving…" : editingPlanId ? "Save plan" : "Create plan"}</button>
            {editingPlanId && <button onClick={() => { setEditingPlanId(""); setDraft(blankPlan); setEntitlements([]); }} type="button">Cancel edit</button>}</div>
        </form>
      </section>

      <section className="api-billing-section">
        <h2>Configured plans</h2>
        <div className="developers-table-wrap"><table className="developers-table api-billing-table">
          <thead><tr><th>Plan</th><th>Status</th><th>Price</th><th>Products / quotas</th><th>Checkout</th><th>Actions</th></tr></thead>
          <tbody>{plans.map((plan) => <tr key={plan.id}><td>{plan.name}<br /><code>{plan.slug}</code><br /><small>{plan.description}</small></td>
            <td>{plan.status}</td><td>{plan.free ? "Free" : plan.priceMinorUnits === null ? "Not configured" : `${plan.priceMinorUnits} ${plan.currency ?? ""} minor units`}<br />Tax: {plan.taxRateBasisPoints === null ? "Not configured" : `${plan.taxRateBasisPoints} bps`} · {plan.periodDays ?? "—"} days</td>
            <td>{plan.products.map((item) => <div key={item.productId}>{item.product.name}: {item.requestsPerMinute}/min, {item.dailyQuota}/day, {item.monthlyQuota}/month</div>)}</td>
            <td>{plan.checkoutEnabled ? "Mock sandbox" : plan.free ? "Free enrollment" : "Disabled"}</td>
            <td><button className="api-billing-action" onClick={() => editPlan(plan)} type="button">Edit</button></td></tr>)}
            {!plans.length && <tr><td colSpan={6}>No plans have been configured yet.</td></tr>}</tbody>
        </table></div>
      </section>

      <section className="api-billing-section">
        <h2>Recent payments and refunds</h2>
        <div className="developers-table-wrap"><table className="developers-table api-billing-table">
          <thead><tr><th>Payment</th><th>Developer</th><th>Plan</th><th>Status</th><th>Amount</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment.id}><td><code>{payment.id}</code><br />{payment.isSandbox ? "Sandbox" : "Live"}</td>
            <td>{payment.subscription.developer.fullName || payment.subscription.developer.email}<br /><small>{payment.subscription.developer.email}</small><br /><code>{payment.subscription.developerUserId}</code></td>
            <td>{payment.subscription.plan.name}</td><td>{payment.status}</td><td>{payment.amountMinorUnits} {payment.currency} minor units<br />Refunded: {payment.refundedAmountMinorUnits}</td><td>{new Date(payment.createdAt).toLocaleString()}</td>
            <td>{payment.status === "SUCCEEDED" && payment.isSandbox && <button className="api-billing-action" disabled={busy} onClick={() => void refund(payment)} type="button">Refund</button>}</td></tr>)}
            {!payments.length && <tr><td colSpan={7}>No payment records exist.</td></tr>}</tbody>
        </table></div>
      </section>
    </> : <>
      <section className="api-billing-section">
        <h2>Your subscription</h2>
        {grandfathered && <p className="api-billing-notice">Your existing Developer access is grandfathered. Existing grants and API keys remain intact; a plan is not required for current access.</p>}
        {subscription ? <div className="api-billing-current">
          <strong>{subscription.plan.name}</strong><span>Status: {subscription.status}</span>
          <span>Period ends: {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleString() : "Not set"}</span>
          {subscription.cancelAtPeriodEnd && <span>Cancellation is scheduled at period end.</span>}
          {!subscription.cancelAtPeriodEnd && <button className="api-billing-action" disabled={busy} onClick={() => void cancelSubscription()} type="button">Cancel at period end</button>}
        </div> : <p>No active subscription. Plan enrollment is optional for grandfathered accounts and required for new Developer access.</p>}
        {history.some((item) => item.status === "PENDING") && <p>Pending sandbox payment: no real charge has been made. Access begins only after provider confirmation.</p>}
        <p className="developers-note">Payment mode: {paymentMode}. Renewals are manual. Cancellation takes effect at the end of the current period; expired subscriptions receive no grace period.</p>
      </section>
      <section className="api-billing-section">
        <h2>Available plans</h2>
        <div className="api-plan-cards">{plans.map((plan) => <article className="api-plan-card" key={plan.id}>
          <h3>{plan.name}</h3><p>{plan.description}</p>
          <strong>{plan.free ? "Free" : plan.priceMinorUnits === null ? "Price not configured" : `${plan.priceMinorUnits} ${plan.currency ?? ""} minor units`}</strong>
          <p>Renews manually every {plan.periodDays ?? "—"} days</p>
          <ul>{plan.products.map((item) => <li key={item.productId}>{item.product.name}: {item.requestsPerMinute}/min · {item.dailyQuota}/day · {item.monthlyQuota}/month</li>)}</ul>
          <button className="api-billing-action" disabled={busy || Boolean(subscription) || (!plan.free && !plan.checkoutEnabled)} onClick={() => void enroll(plan)} type="button">
            {plan.free ? "Choose free plan" : plan.checkoutEnabled ? "Create sandbox checkout" : "Paid checkout unavailable"}
          </button>
        </article>)}
          {!plans.length && <p>No active plans are available. Contact LIFE support.</p>}
        </div>
      </section>
      <section className="api-billing-section">
        <h2>Invoices</h2>
        <div className="developers-table-wrap"><table className="developers-table api-billing-table">
          <thead><tr><th>Invoice</th><th>Plan</th><th>Status</th><th>Amount</th><th>Issued</th><th>Payment type</th></tr></thead>
          <tbody>{invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.invoiceNumber}</td><td>{invoice.subscription.plan.name}</td><td>{invoice.status}</td>
            <td>{invoice.totalMinorUnits} {invoice.currency} minor units</td><td>{new Date(invoice.issuedAt).toLocaleDateString()}</td>
            <td>{invoice.payment?.isSandbox ? "Sandbox only" : "Free / non-payment"}</td></tr>)}
            {!invoices.length && <tr><td colSpan={6}>No invoices have been issued.</td></tr>}</tbody>
        </table></div>
      </section>
    </>}
  </div>;
}
