import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import "../../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developer Sign In | LIFE",
  robots: { index: false, follow: false },
};

export default async function DeveloperLoginPage() {
  const destination = "/developers/dashboard";
  const user = await getCurrentUser();
  if (user?.role === "DEVELOPER") redirect(destination);
  if (user) redirect("/developers?access=developer-required");
  return <LoginExperience returnTo={destination} portal="developer" />;
}
