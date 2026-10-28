import { getCurrentUser } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { inspectDatabaseInitialization } from "@/server/database-initialization";
import { measureDatabaseStorage } from "@/server/database-storage";
import { notFound, redirect } from "next/navigation";
import TranslationNotice from "../TranslationNotice";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return <main className="super-admin-recovery" style={{ maxWidth: 680, margin: "12vh auto", padding: 24 }}>
      <h1>Administrator dashboard unavailable</h1>
      <p>The database connection or required authentication schema could not be checked. This is not treated as an empty database.</p>
    </main>;
  }
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") notFound();

  let initialization;
  try {
    initialization = await inspectDatabaseInitialization(getPrisma());
  } catch {
    initialization = null;
  }
  if (!initialization || initialization.state === "connection-unavailable") {
    return <main className="super-admin-recovery" style={{ maxWidth: 680, margin: "12vh auto", padding: 24 }}>
      <h1>Administrator dashboard unavailable</h1>
      <p>The database could not be checked. This is not treated as an empty database. Try again later or contact the database operator.</p>
    </main>;
  }
  if (initialization.state !== "initialized") {
    const storage = await measureDatabaseStorage(getPrisma());
    return <main className="super-admin-recovery" style={{ maxWidth: 680, margin: "12vh auto", padding: 24 }}>
      <h1>Database setup or recovery required</h1>
      <p>Normal administrator access is paused because the database is not fully initialized or has no eligible Super Admin.</p>
      <section aria-label="Database storage status">
        <h2>Read-only storage status</h2>
        <p>Database size: {storage.databaseBytes === null ? "Unknown / unavailable" : `${(storage.databaseBytes / (1024 ** 3)).toFixed(3)} GiB`}</p>
        <p>Quota, object storage, and backup storage: Unknown (no verified provider quota source is configured).</p>
        <p>Measurement: {storage.measuredAt ? `${storage.measuredAt} · ${storage.source}` : "Unavailable"}</p>
      </section>
      <p>No data has been changed. Do not upload a database file or attempt to bootstrap an administrator from this screen.</p>
      <p>Contact the authorized database operator to review the migration and recovery state.</p>
    </main>;
  }
  const prisma = getPrisma();
  const [userCount, profileCount, chartCount, storage] = await Promise.all([
    prisma.user.count(),
    prisma.birthProfile.count(),
    prisma.savedChart.count(),
    measureDatabaseStorage(prisma),
  ]);
  return <main style={{ maxWidth: 900, margin: "4rem auto", padding: "2rem" }}>
    <TranslationNotice />
    <a href="/">← LIFE</a>
    <h1>Administrator</h1>
    <p>Signed in as {user.email} · {user.role}</p>
    <ul>
      <li>{userCount} accounts</li>
      <li>{profileCount} birth profiles</li>
      <li>{chartCount} saved charts</li>
    </ul>
    <section aria-label="Database storage status">
      <h2>Read-only storage status</h2>
      <p>Database size: {storage.databaseBytes === null ? "Unknown / unavailable" : `${(storage.databaseBytes / (1024 ** 3)).toFixed(3)} GiB`}</p>
      <p>Quota, object storage, and backup storage: Unknown (no verified provider quota source is configured).</p>
      <p>Measurement: {storage.measuredAt ? `${storage.measuredAt} · ${storage.source}` : "Unavailable"}</p>
    </section>
    <p>Account and record access is enforced by server-side role and ownership checks.</p>
    <p><a href="/admin/api">Manage developer API access</a></p>
    <p><a href="/admin/scripts">Manage trusted head and body scripts</a></p>
  </main>;
}
