import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import ApiAnalyticsDashboard from "../../ApiAnalyticsDashboard";
import "../super-admin.css";

export const dynamic = "force-dynamic";

export default async function SuperAdminApiAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();
  return <main className="super-admin-shell"><ApiAnalyticsDashboard superAdmin /></main>;
}
