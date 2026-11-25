import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "./LoginExperience";
import { getCurrentUser } from "@/server/auth";
import "./login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign In | LIFE",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginExperience returnTo="/dashboard" />;
}
