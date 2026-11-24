import { redirect } from "next/navigation";
import AstrologyServiceWorkspace from "../AstrologyServiceWorkspace";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AnkJyotishPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fank-jyotish");
  return <AstrologyServiceWorkspace service="ank-jyotish" />;
}
