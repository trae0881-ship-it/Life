import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import DatabaseCenter from "./DatabaseCenter";
import "../super-admin.css";

export const dynamic = "force-dynamic";

export default async function SuperAdminDatabasePage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return (
      <main className="super-admin-recovery">
        <h1>Database Center unavailable</h1>
        <p>The database could not be checked. This is not treated as an empty database.</p>
        <a href="/super-login">Return to Super Admin sign-in</a>
      </main>
    );
  }
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();

  return (
    <main className="super-admin-shell">
      <aside className="super-admin-sidebar">
        <a className="super-admin-brand" href="/super-admin">Super Admin<small>LIFE · OPERATIONS</small></a>
        <nav aria-label="Super Admin navigation" className="super-admin-nav">
          <a href="/super-admin">Overview</a>
          <a className="active" href="/super-admin/database" aria-current="page">Database Center</a>
        </nav>
        <div className="super-admin-sidebar-foot"><a href="/dashboard">User panel</a></div>
      </aside>
      <section className="super-admin-main">
        <header className="super-admin-topbar"><span>Database Center</span><span>Super Admin</span></header>
        <div className="super-admin-content">
          <p className="super-admin-eyebrow">LIFE · OPERATIONS</p>
          <h1>Database Center</h1>
          <DatabaseCenter />
        </div>
      </section>
    </main>
  );
}
