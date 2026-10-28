import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import ApiPlatformDashboard from "../../ApiPlatformDashboard";

export const dynamic = "force-dynamic";

export default async function AdminApiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fapi");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") notFound();
  return <ApiPlatformDashboard email={user.email} role={user.role} userId={user.id} />;
}
