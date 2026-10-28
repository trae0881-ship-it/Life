import { redirect } from "next/navigation";
import AssistantWorkspacePage from "../../AssistantWorkspacePage";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DashboardQuestionsPage() {
  if (!await getCurrentUser()) redirect("/login?next=%2Fdashboard%2Fquestions");
  return <AssistantWorkspacePage />;
}
