import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginExperience from "../login/LoginExperience";
import { getCurrentUser } from "@/server/auth";
import "../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Create an Account | LIFE",
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginExperience returnTo="/dashboard" initialMode="register" />;
}
