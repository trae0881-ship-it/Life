import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import { safeDeveloperReturnTo } from "@/server/developer-auth-redirect";
import "../../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer Sign In | LIFE",
  robots: { index: false, follow: false },
};

type DeveloperLoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function DeveloperLoginPage({ searchParams }: DeveloperLoginPageProps) {
  const params = await searchParams;
  const destination = safeDeveloperReturnTo(typeof params.next === "string" ? params.next : undefined);
  const user = await getCurrentUser();
  if (user?.role === "DEVELOPER") redirect(destination);
  if (user) redirect("/developers?access=developer-required");
  return <LoginExperience returnTo={destination} portal="developer" />;
}
