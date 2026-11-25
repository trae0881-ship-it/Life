import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function KpAstrologyPage() {
  if (!await getCurrentUser()) redirect("/login");
  redirect("/studio#kp");
}
