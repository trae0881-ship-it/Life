import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import SuperAdminLoginForm from "./SuperAdminLoginForm";
import "../login/login.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Super Admin Sign In | LIFE",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SuperAdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "SUPER_ADMIN") redirect("/super-admin");
  return <main className="login-page">
    <a className="login-brand" href="/">✳ LIFE</a>
    <section className="login-card" aria-labelledby="super-login-title">
      <p className="home-eyebrow">RESTRICTED ADMINISTRATION</p>
      <h1 id="super-login-title">Super Admin sign in</h1>
      <p>Use the existing authorized Super Admin account. This portal does not create or promote accounts.</p>
      <SuperAdminLoginForm />
      <a className="login-home-link" href="/forgot-password">Forgot password?</a>
      <a className="login-home-link" href="/login">Sign in as a LIFE user</a>
      <a className="login-home-link" href="/">Return to LIFE</a>
    </section>
  </main>;
}
