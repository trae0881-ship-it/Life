import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PalmistryWorkspace from "../PalmistryWorkspace";
import { metadataForManagedPage } from "@/server/seo-management";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/palmistry");
}

export default async function PalmistryPage() {
  if (!await getCurrentUser()) redirect("/login?next=%2Fpalmistry");
  return <PalmistryWorkspace />;
}
