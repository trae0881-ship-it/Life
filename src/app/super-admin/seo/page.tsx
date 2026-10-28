import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import SeoManagementDashboard from "./SeoManagementDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO Management | LIFE Super Admin",
  robots: { index: false, follow: false },
};

export default async function SeoManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();
  return <SeoManagementDashboard email={user.email} />;
}
