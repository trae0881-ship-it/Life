"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { readLanguagePreference } from "@/presentation/language-preference";
import { translate, type Language } from "@/presentation/language";
import "./super-admin.css";

type Metrics = { accounts: number; profiles: number; savedCharts: number; questions: number };
type Health = { engine: "ready" | "unavailable"; database: "connected" | "not-configured" | "unreachable" };
type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "USER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
  profileCount: number;
};
type UserFilters = { query: string; role: string };
type AuditEvent = {
  id: string;
  actorUserId: string | null;
  actorLabel: string | null;
  action: "USER_LIST_READ" | "USER_FILTERED_READ" | "USER_ROLE_CHANGED" | "BOOTSTRAP_SUPER_ADMIN";
  page: number;
  resultCount: number;
  targetUserId: string | null;
  fromRole: string | null;
  toRole: string | null;
  createdAt: string;
};
type AuditFilters = { action: string; startDate: string; endDate: string };
type ModuleId = "overview" | "users" | "health" | "auditLogs";

const modules: ModuleId[] = ["overview", "users", "health", "auditLogs"];
const moduleLabels: Record<ModuleId, string> = {
  overview: "superAdmin.overview",
  users: "superAdmin.users",
  health: "superAdmin.health",
  auditLogs: "superAdmin.auditLogs",
};

function validMetrics(value: unknown): value is Metrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const metrics = value as Record<string, unknown>;
  return ["accounts", "profiles", "savedCharts", "questions"].every(
    (key) => Number.isSafeInteger(metrics[key]) && (metrics[key] as number) >= 0,
  );
}

function validUserList(value: unknown): value is { users: AdminUser[]; page: number; pageCount: number; total: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.users)
    && Number.isSafeInteger(result.page)
    && Number.isSafeInteger(result.pageCount)
    && Number.isSafeInteger(result.total)
    && result.users.every((user) => {
      if (!user || typeof user !== "object" || Array.isArray(user)) return false;
      const item = user as Record<string, unknown>;
      return typeof item.id === "string"
        && typeof item.email === "string"
        && (item.fullName === null || typeof item.fullName === "string")
        && ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(item.role as string)
        && typeof item.createdAt === "string"
        && Number.isSafeInteger(item.profileCount);
    });
}

function validAuditList(value: unknown): value is { events: AuditEvent[]; page: number; pageCount: number; total: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.events)
    && Number.isSafeInteger(result.page)
    && Number.isSafeInteger(result.pageCount)
    && Number.isSafeInteger(result.total)
    && result.events.every((event) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return false;
      const item = event as Record<string, unknown>;
      return typeof item.id === "string"
        && (item.actorUserId === null || typeof item.actorUserId === "string")
        && (item.actorLabel === null || typeof item.actorLabel === "string")
        && ["USER_LIST_READ", "USER_FILTERED_READ", "USER_ROLE_CHANGED", "BOOTSTRAP_SUPER_ADMIN"].includes(item.action as string)
        && Number.isSafeInteger(item.page)
        && Number.isSafeInteger(item.resultCount)
        && (item.targetUserId === null || typeof item.targetUserId === "string")
        && (item.fromRole === null || typeof item.fromRole === "string")
        && (item.toRole === null || typeof item.toRole === "string")
        && typeof item.createdAt === "string"
        && Number.isFinite(Date.parse(item.createdAt));
    });
}

export default function SuperAdminDashboard({ email, userId }: { email: string; userId: string }) {
  const [language, setLanguage] = useState<Language>("en");
  const [activeModule, setActiveModule] = useState<ModuleId>("overview");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [metricsDenied, setMetricsDenied] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageCount, setUsersPageCount] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState("");
  const [roleUpdateError, setRoleUpdateError] = useState(false);
  const [roleUpdateDenied, setRoleUpdateDenied] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("ALL");
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>({ query: "", role: "ALL" });
  const [usersDenied, setUsersDenied] = useState(false);
  const usersRequest = useRef<AbortController | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageCount, setAuditPageCount] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const [auditDenied, setAuditDenied] = useState(false);
  const [auditAction, setAuditAction] = useState("ALL");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [appliedAuditFilters, setAppliedAuditFilters] = useState<AuditFilters>({ action: "ALL", startDate: "", endDate: "" });
  const auditRequest = useRef<AbortController | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);
  const [healthDenied, setHealthDenied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const t = (key: string) => translate(language, key);

  useEffect(() => setLanguage(readLanguagePreference(window.localStorage)), []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(false);
    setMetricsDenied(false);
    try {
      const response = await fetch("/api/super-admin/overview", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setMetricsDenied(true);
        return;
      }
      if (!response.ok) throw new Error("Metrics request failed.");
      const body: unknown = await response.json();
      if (!validMetrics(body)) throw new Error("Metrics response was invalid.");
      setMetrics(body);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(false);
    setHealthDenied(false);
    try {
      const response = await fetch("/api/super-admin/health", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setHealthDenied(true);
        return;
      }
      if (!response.ok) throw new Error("Health request failed.");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Health response was invalid.");
      const result = body as Record<string, unknown>;
      if (!["ready", "unavailable"].includes(result.engine as string)
        || !["connected", "not-configured", "unreachable"].includes(result.database as string)) {
        throw new Error("Health response was invalid.");
      }
      setHealth({ engine: result.engine as Health["engine"], database: result.database as Health["database"] });
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const loadUsers = useCallback(async (page: number, filters: UserFilters) => {
    usersRequest.current?.abort();
    const controller = new AbortController();
    usersRequest.current = controller;
    setUsersLoading(true);
    setUsersError(false);
    setUsersDenied(false);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filters.query) params.set("q", filters.query);
      if (filters.role !== "ALL") params.set("role", filters.role);
      const response = await fetch(`/api/super-admin/users?${params}`, { cache: "no-store", signal: controller.signal });
      if (response.status === 401 || response.status === 403) {
        setUsersDenied(true);
        return;
      }
      if (!response.ok) throw new Error("Account query failed.");
      const body: unknown = await response.json();
      if (!validUserList(body)) throw new Error("Account response was invalid.");
      setUsers(body.users);
      setUsersPage(body.page);
      setUsersPageCount(body.pageCount);
      setUsersTotal(body.total);
      setUsersLoaded(true);
    } catch {
      if (!controller.signal.aborted) setUsersError(true);
    } finally {
      if (!controller.signal.aborted) setUsersLoading(false);
    }
  }, []);

  const loadAuditEvents = useCallback(async (page: number, filters: AuditFilters) => {
    auditRequest.current?.abort();
    const controller = new AbortController();
    auditRequest.current = controller;
    setAuditLoading(true);
    setAuditError(false);
    setAuditDenied(false);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filters.action !== "ALL") params.set("action", filters.action);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      const response = await fetch(`/api/super-admin/audit-logs?${params}`, { cache: "no-store", signal: controller.signal });
      if (response.status === 401 || response.status === 403) {
        setAuditDenied(true);
        return;
      }
      if (!response.ok) throw new Error("Audit-log request failed.");
      const body: unknown = await response.json();
      if (!validAuditList(body)) throw new Error("Audit-log response was invalid.");
      setAuditEvents(body.events);
      setAuditPage(body.page);
      setAuditPageCount(body.pageCount);
      setAuditTotal(body.total);
      setAuditLoaded(true);
    } catch {
      if (!controller.signal.aborted) setAuditError(true);
    } finally {
      if (!controller.signal.aborted) setAuditLoading(false);
    }
  }, []);

  async function updateUserRole(account: AdminUser, role: string) {
    if (account.id === userId || account.role === "SUPER_ADMIN" || !["USER", "DEVELOPER", "ADMIN"].includes(role)) return;
    setRoleUpdatingId(account.id);
    setRoleUpdateError(false);
    setRoleUpdateDenied(false);
    try {
      const response = await fetch(`/api/super-admin/users/${encodeURIComponent(account.id)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (response.status === 401 || response.status === 403) {
        setRoleUpdateDenied(true);
        throw new Error("Role update was denied.");
      }
      if (!response.ok) throw new Error("Role update failed.");
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !("role" in result) || result.role !== role) throw new Error("Role update response was invalid.");
      setUsers((current) => current.map((item) => item.id === account.id ? { ...item, role: role as AdminUser["role"] } : item));
      if (auditLoaded) void loadAuditEvents(1, appliedAuditFilters);
    } catch {
      setRoleUpdateError(true);
    } finally {
      setRoleUpdatingId("");
    }
  }

  useEffect(() => {
    if (activeModule === "users" && !usersLoaded && !usersLoading && !usersError) {
      void loadUsers(1, appliedFilters);
    }
  }, [activeModule, appliedFilters, loadUsers, usersError, usersLoaded, usersLoading]);

  useEffect(() => {
    if (activeModule === "auditLogs" && !auditLoaded && !auditLoading && !auditError) {
      void loadAuditEvents(1, appliedAuditFilters);
    }
  }, [activeModule, appliedAuditFilters, auditError, auditLoaded, auditLoading, loadAuditEvents]);

  useEffect(() => {
    if (activeModule === "health" && !health && !healthLoading && !healthError) void loadHealth();
  }, [activeModule, health, healthError, healthLoading, loadHealth]);

  useEffect(() => () => {
    usersRequest.current?.abort();
    auditRequest.current?.abort();
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      window.location.assign("/");
    } catch {
      setSigningOut(false);
      setSignOutError(true);
    }
  }

  function applyUserFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { query: accountSearch.trim(), role: roleSearch };
    setAppliedFilters(nextFilters);
    void loadUsers(1, nextFilters);
  }

  function applyAuditFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { action: auditAction, startDate: auditStartDate, endDate: auditEndDate };
    setAppliedAuditFilters(nextFilters);
    void loadAuditEvents(1, nextFilters);
  }

  const cards: { key: keyof Metrics; label: string }[] = [
    { key: "accounts", label: "superAdmin.accounts" },
    { key: "profiles", label: "superAdmin.profiles" },
    { key: "savedCharts", label: "superAdmin.savedCharts" },
    { key: "questions", label: "superAdmin.questions" },
  ];

  return (
    <main className="super-admin-shell">
      <aside className="super-admin-sidebar">
        <a className="super-admin-brand" href="/super-admin">{t("superAdmin.title")}<small>LIFE · OPERATIONS</small></a>
        <p className="super-admin-identity"><span>{t("superAdmin.signedInAs")}</span><b>{email}</b></p>
        <nav aria-label={t("superAdmin.navigation")} className="super-admin-nav">
          {modules.map((module) => (
            <button
              aria-current={activeModule === module ? "page" : undefined}
              className={activeModule === module ? "active" : ""}
              key={module}
              onClick={() => setActiveModule(module)}
              type="button"
            >
              {t(moduleLabels[module])}
            </button>
          ))}
          <a href="/super-admin/seo">{t("superAdmin.seoManagement")}</a>
          <a href="/super-admin/blogs">Blog Management</a>
          <a href="/super-admin/api">API Management</a>
          <a href="/super-admin/database">Database Center</a>
          <a href="/admin/scripts">Head / body scripts</a>
        </nav>
        <div className="super-admin-sidebar-foot">
          <a href="/dashboard">{t("superAdmin.userPanel")}</a>
          <button disabled={signingOut} onClick={() => void signOut()} type="button">
            {signingOut ? t("dashboard.saving") : t("superAdmin.signOut")}
          </button>
          {signOutError && <p role="alert">{t("superAdmin.signOutError")}</p>}
        </div>
      </aside>

      <section className="super-admin-main">
        <header className="super-admin-topbar"><span>{t(moduleLabels[activeModule])}</span><span>{t("superAdmin.title")}</span></header>
        <div className="super-admin-content">
          <p className="super-admin-eyebrow">LIFE · ADMINISTRATION</p>
          <h1>{t(moduleLabels[activeModule])}</h1>
          {activeModule === "overview" ? (
            <>
              <p className="super-admin-description">{t("superAdmin.overviewDescription")}</p>
              {loading ? <p aria-live="polite" className="super-admin-state">{t("superAdmin.loading")}</p> : null}
              {error ? (
                <div className="super-admin-error" role="alert">
                  <p>{t("superAdmin.loadError")}</p>
                  <button onClick={() => void loadMetrics()} type="button">{t("superAdmin.retry")}</button>
                </div>
              ) : null}
              {metricsDenied ? <p className="super-admin-error" role="alert">{t("superAdmin.permissionDenied")}</p> : null}
              {!loading && !error && metrics ? (
                <div className="super-admin-metrics">
                  {cards.map(({ key, label }) => (
                    <article className="super-admin-card" key={key}>
                      <h2>{t(label)}</h2>
                      <p>{metrics[key].toLocaleString(language === "hi" ? "hi-IN" : "en")}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              {!loading && !error && !metricsDenied && !metrics ? <p className="super-admin-unavailable" role="status">{t("superAdmin.noMetrics")}</p> : null}
            </>
          ) : activeModule === "users" ? (
            <section aria-label={t("superAdmin.users")} className="super-admin-users">
              <form className="super-admin-user-filters" onSubmit={applyUserFilters}>
                <label>
                  <span>{t("superAdmin.searchAccount")}</span>
                  <input maxLength={254} onChange={(event) => setAccountSearch(event.target.value)} value={accountSearch} />
                </label>
                <label>
                  <span>{t("superAdmin.roleFilter")}</span>
                  <select onChange={(event) => setRoleSearch(event.target.value)} value={roleSearch}>
                    <option value="ALL">{t("superAdmin.allEvents")}</option>
                    {(["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"] as const).map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <button type="submit">{t("superAdmin.search")}</button>
              </form>
              {usersLoading ? <p aria-live="polite" className="super-admin-state">{t("superAdmin.loading")}</p> : null}
              {usersError ? (
                <div className="super-admin-error" role="alert">
                  <p>{t("superAdmin.accountLoadError")}</p>
                  <button onClick={() => void loadUsers(usersPage, appliedFilters)} type="button">{t("superAdmin.retry")}</button>
                </div>
              ) : null}
              {usersDenied ? <p className="super-admin-error" role="alert">{t("superAdmin.permissionDenied")}</p> : null}
              {roleUpdateError ? <p className="super-admin-error" role="alert">{t(roleUpdateDenied ? "superAdmin.permissionDenied" : "superAdmin.roleUpdateError")}</p> : null}
              {!usersLoading && !usersError && !usersDenied && users.length === 0 ? <p className="super-admin-unavailable" role="status">{t("superAdmin.noUsers")}</p> : null}
              {!usersLoading && !usersError && !usersDenied && users.length > 0 ? (
                <>
                  <p className="super-admin-user-total">{usersTotal.toLocaleString(language === "hi" ? "hi-IN" : "en")} {t("superAdmin.accounts")}</p>
                  <div className="super-admin-table-wrap">
                    <table className="super-admin-user-table">
                      <thead><tr>
                        <th scope="col">{t("superAdmin.accountId")}</th>
                        <th scope="col">{t("superAdmin.fullName")}</th>
                        <th scope="col">{t("superAdmin.email")}</th>
                        <th scope="col">{t("superAdmin.role")}</th>
                        <th scope="col">{t("superAdmin.created")}</th>
                        <th scope="col">{t("superAdmin.profileCount")}</th>
                      </tr></thead>
                      <tbody>{users.map((account) => (
                        <tr key={account.id}>
                          <td>{account.id}</td>
                          <td>{account.fullName ?? "—"}</td>
                          <td>{account.email}</td>
                          <td><label className="sr-only" htmlFor={`role-${account.id}`}>{t("superAdmin.roleManagement")} · {account.email}</label><select id={`role-${account.id}`} aria-label={`${t("superAdmin.roleManagement")} ${account.email}`} disabled={account.id === userId || account.role === "SUPER_ADMIN" || roleUpdatingId === account.id} onChange={(event) => void updateUserRole(account, event.target.value)} value={account.role}><option value="USER">USER</option><option value="DEVELOPER">DEVELOPER</option><option value="ADMIN">ADMIN</option>{account.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}</select></td>
                          <td><time dateTime={account.createdAt}>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { dateStyle: "medium" }).format(new Date(account.createdAt))}</time></td>
                          <td>{account.profileCount}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <nav aria-label={t("superAdmin.users")} className="super-admin-pagination">
                    <button disabled={usersPage <= 1 || usersLoading} onClick={() => void loadUsers(usersPage - 1, appliedFilters)} type="button">{t("superAdmin.previous")}</button>
                    <span>{t("superAdmin.page")} {usersPage} / {usersPageCount}</span>
                    <button disabled={usersPage >= usersPageCount || usersLoading} onClick={() => void loadUsers(usersPage + 1, appliedFilters)} type="button">{t("superAdmin.next")}</button>
                  </nav>
                </>
              ) : null}
            </section>
          ) : activeModule === "auditLogs" ? (
            <section aria-label={t("superAdmin.auditLogs")} className="super-admin-audit">
              <form className="super-admin-audit-filters" onSubmit={applyAuditFilters}>
                <label>
                  <span>{t("superAdmin.auditType")}</span>
                  <select onChange={(event) => setAuditAction(event.target.value)} value={auditAction}>
                    <option value="ALL">{t("superAdmin.allRoles")}</option>
                    <option value="USER_LIST_READ">{t("superAdmin.action.USER_LIST_READ")}</option>
                    <option value="USER_FILTERED_READ">{t("superAdmin.action.USER_FILTERED_READ")}</option>
                    <option value="USER_ROLE_CHANGED">{t("superAdmin.action.USER_ROLE_CHANGED")}</option>
                    <option value="BOOTSTRAP_SUPER_ADMIN">{t("superAdmin.action.BOOTSTRAP_SUPER_ADMIN")}</option>
                  </select>
                </label>
                <label>
                  <span>{t("superAdmin.auditFrom")}</span>
                  <input onChange={(event) => setAuditStartDate(event.target.value)} type="date" value={auditStartDate} />
                </label>
                <label>
                  <span>{t("superAdmin.auditTo")}</span>
                  <input onChange={(event) => setAuditEndDate(event.target.value)} type="date" value={auditEndDate} />
                </label>
                <button type="submit">{t("superAdmin.filterEvents")}</button>
              </form>
              {auditLoading ? <p aria-live="polite" className="super-admin-state">{t("superAdmin.loading")}</p> : null}
              {auditError ? (
                <div className="super-admin-error" role="alert">
                  <p>{t("superAdmin.auditLoadError")}</p>
                  <button onClick={() => void loadAuditEvents(auditPage, appliedAuditFilters)} type="button">{t("superAdmin.retry")}</button>
                </div>
              ) : null}
              {auditDenied ? <p className="super-admin-error" role="alert">{t("superAdmin.permissionDenied")}</p> : null}
              {!auditLoading && !auditError && !auditDenied && auditEvents.length === 0 ? <p className="super-admin-unavailable" role="status">{t("superAdmin.noAuditEvents")}</p> : null}
              {!auditLoading && !auditError && !auditDenied && auditEvents.length > 0 ? (
                <>
                  <p className="super-admin-user-total">{auditTotal.toLocaleString(language === "hi" ? "hi-IN" : "en")} {t("superAdmin.auditLogs")}</p>
                  <div className="super-admin-table-wrap">
                    <table className="super-admin-audit-table">
                      <thead><tr>
                        <th scope="col">{t("superAdmin.eventTime")}</th>
                        <th scope="col">{t("superAdmin.eventActor")}</th>
                        <th scope="col">{t("superAdmin.eventType")}</th>
                        <th scope="col">{t("superAdmin.accountId")}</th>
                        <th scope="col">{t("superAdmin.role")}</th>
                        <th scope="col">{t("superAdmin.eventPage")}</th>
                        <th scope="col">{t("superAdmin.eventResultCount")}</th>
                      </tr></thead>
                      <tbody>{auditEvents.map((event) => (
                        <tr key={event.id}>
                          <td><time dateTime={event.createdAt}>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.createdAt))}</time></td>
                          <td>{event.actorLabel ?? event.actorUserId ?? "—"}</td>
                          <td>{t(`superAdmin.action.${event.action}`)}</td>
                          <td>{event.targetUserId ?? "—"}</td>
                          <td>{event.fromRole && event.toRole ? `${event.fromRole} → ${event.toRole}` : "—"}</td>
                          <td>{event.page}</td>
                          <td>{event.resultCount}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <nav aria-label={t("superAdmin.auditLogs")} className="super-admin-pagination">
                    <button disabled={auditPage <= 1 || auditLoading} onClick={() => void loadAuditEvents(auditPage - 1, appliedAuditFilters)} type="button">{t("superAdmin.previous")}</button>
                    <span>{t("superAdmin.page")} {auditPage} / {auditPageCount}</span>
                    <button disabled={auditPage >= auditPageCount || auditLoading} onClick={() => void loadAuditEvents(auditPage + 1, appliedAuditFilters)} type="button">{t("superAdmin.next")}</button>
                  </nav>
                </>
              ) : null}
            </section>
          ) : activeModule === "health" ? (
            <section aria-label={t("superAdmin.health")} className="super-admin-health">
              <p className="super-admin-description">{t("superAdmin.healthDescription")}</p>
              {healthLoading ? <p aria-live="polite" className="super-admin-state">{t("superAdmin.healthLoading")}</p> : null}
              {healthError ? (
                <div className="super-admin-error" role="alert">
                  <p>{t("superAdmin.healthError")}</p>
                  <button onClick={() => void loadHealth()} type="button">{t("superAdmin.retry")}</button>
                </div>
              ) : null}
              {healthDenied ? <p className="super-admin-error" role="alert">{t("superAdmin.permissionDenied")}</p> : null}
              {!healthLoading && !healthError && !healthDenied && health ? (
                <div className="super-admin-health-grid">
                  <article className="super-admin-card">
                    <h2>{t("superAdmin.engineStatus")}</h2>
                    <p>{t(`superAdmin.status.${health.engine}`)}</p>
                  </article>
                  <article className="super-admin-card">
                    <h2>{t("superAdmin.databaseStatus")}</h2>
                    <p>{t(`superAdmin.status.${health.database}`)}</p>
                  </article>
                  <button className="super-admin-health-retry" onClick={() => void loadHealth()} type="button">{t("superAdmin.refreshHealth")}</button>
                </div>
              ) : null}
            </section>
          ) : (
            <p className="super-admin-unavailable" role="status">{t("superAdmin.noMetrics")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
