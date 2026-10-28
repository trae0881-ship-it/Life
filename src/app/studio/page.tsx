import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ChartStudioWorkspace from "../ChartStudioWorkspace";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Chart Studio | LIFE",
  robots: { index: false, follow: false },
};

type StudioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChartStudioPage({ searchParams }: StudioPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    const params = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value)) for (const item of value) query.append(key, item);
    }
    const target = query.size ? `/studio?${query}` : "/studio";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  return <ChartStudioWorkspace />;
}
