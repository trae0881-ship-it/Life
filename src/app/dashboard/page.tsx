import { redirect } from "next/navigation";
import Dashboard from "../Dashboard";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  return <Dashboard user={user} />;
}
