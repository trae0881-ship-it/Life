import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import BlogManagementDashboard from "./BlogManagementDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog Management | LIFE Super Admin", robots: { index: false, follow: false } };

export default async function BlogManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-login");
  if (user.role !== "SUPER_ADMIN") notFound();
  return <BlogManagementDashboard author={user.email} />;
}
