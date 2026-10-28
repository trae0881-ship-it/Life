import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import { safeReturnTo } from "@/server/auth-redirect";
import "../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Create an Account | LIFE",
  robots: { index: false, follow: false },
};

type SignUpPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const destination = safeReturnTo(typeof params.next === "string" ? params.next : undefined);
  if (await getCurrentUser()) redirect(destination);
  return <LoginExperience returnTo={destination} initialMode="register" />;
}
