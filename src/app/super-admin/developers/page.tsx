import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import DeveloperManagementDashboard from "../DeveloperManagementDashboard";
import "../super-admin.css";

export const dynamic = "force-dynamic";

export default async function SuperAdminDevelopersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();
  return <main className="super-admin-shell"><DeveloperManagementDashboard /></main>;
}
