import { getCurrentUser } from "@/server/auth";
import { getPrisma } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import ApiPlatformDashboard from "../../ApiPlatformDashboard";

export const dynamic = "force-dynamic";

export default async function DeveloperDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/developer/login");
  if (user.role !== "DEVELOPER") notFound();
  const profile = await getPrisma().apiDeveloperProfile.findUnique({ where: { userId: user.id }, select: { status: true } });
  if (profile?.status !== "VERIFIED") redirect("/developers");
  return <ApiPlatformDashboard email={user.email} role={user.role} userId={user.id} />;
}
