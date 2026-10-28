import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import { safeDeveloperReturnTo, safeDeveloperSignupReturnTo } from "@/server/developer-auth-redirect";
import "../../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer Account | LIFE",
  robots: { index: false, follow: false },
};

type DeveloperSignupPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function DeveloperSignupPage({ searchParams }: DeveloperSignupPageProps) {
  const params = await searchParams;
  const requestedDestination = typeof params.next === "string" ? params.next : undefined;
  const destination = safeDeveloperSignupReturnTo(requestedDestination);
  const user = await getCurrentUser();
  if (user?.role === "DEVELOPER") redirect(safeDeveloperReturnTo(requestedDestination));
  if (user) redirect("/developers?access=approval-required");
  return <LoginExperience returnTo={destination} initialMode="register" portal="developer" />;
}
