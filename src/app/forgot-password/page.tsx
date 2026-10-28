import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";
import "../login/login.css";

export const metadata: Metadata = {
  title: "Forgot password | LIFE",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ForgotPasswordPage() {
  return <main className="login-page">
    <a className="login-brand" href="/">✳ LIFE</a>
    <section className="login-card" aria-labelledby="recovery-title">
      <p className="home-eyebrow">ACCOUNT RECOVERY</p>
      <h1 id="recovery-title">Reset your password</h1>
      <p>Enter the email address for your LIFE account. If it matches an account, and email delivery is available, reset instructions will be sent.</p>
      <ForgotPasswordForm />
      <a className="login-home-link" href="/login">Return to sign in</a>
    </section>
  </main>;
}
