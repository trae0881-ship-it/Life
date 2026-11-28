import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import "../../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer Account | LIFE",
  robots: { index: false, follow: false },
};

export default async function DeveloperSignupPage() {
  const destination = "/developers/dashboard";
  const user = await getCurrentUser();
  if (user?.role === "DEVELOPER") redirect("/developers/dashboard");
  if (user) redirect("/developers");
  return <LoginExperience returnTo={destination} initialMode="register" portal="developer" />;
}
