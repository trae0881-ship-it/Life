import { redirect } from "next/navigation";
import AssistantWorkspacePage from "../../AssistantWorkspacePage";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DashboardAssistantPage() {
  if (!await getCurrentUser()) redirect("/login");
  return <AssistantWorkspacePage />;
}
