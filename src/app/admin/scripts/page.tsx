import { getCurrentUser } from "@/server/auth";
import { notFound, redirect } from "next/navigation";
import AdminScriptManager from "./AdminScriptManager";
import "../../super-admin/super-admin.css";
import "./admin-scripts.css";

export const dynamic = "force-dynamic";

export default async function AdminScriptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fscripts");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") notFound();
  return <AdminScriptManager email={user.email} role={user.role} />;
}
