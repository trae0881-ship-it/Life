import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import SuperAdminDashboard from "./SuperAdminDashboard";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();

  return <SuperAdminDashboard email={user.email} userId={user.id} />;
}
