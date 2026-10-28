import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "./LoginExperience";
import { getCurrentUser } from "@/server/auth";
import { safeReturnTo } from "@/server/auth-redirect";
import "./login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign In | LIFE",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const destination = safeReturnTo(typeof params.next === "string" ? params.next : undefined);
  if (await getCurrentUser()) redirect(destination);
  return <LoginExperience returnTo={destination} />;
}
