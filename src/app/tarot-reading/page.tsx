import { redirect } from "next/navigation";
import AstrologyServiceWorkspace from "../AstrologyServiceWorkspace";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function TarotReadingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AstrologyServiceWorkspace service="tarot" />;
}
