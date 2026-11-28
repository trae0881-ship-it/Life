import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import ApiProductsDashboard from "../ApiProductsDashboard";

export const dynamic = "force-dynamic";

export default async function SuperAdminApiProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();
  return <ApiProductsDashboard />;
}
