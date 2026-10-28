import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";
import "../login/login.css";

export const metadata: Metadata = {
  title: "Choose a new password | LIFE",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <main className="login-page">
    <a className="login-brand" href="/">✳ LIFE</a>
    <section className="login-card" aria-labelledby="reset-title">
      <p className="home-eyebrow">ACCOUNT RECOVERY</p>
      <h1 id="reset-title">Choose a new password</h1>
      <p>Reset links expire after 30 minutes and can be used once. Updating your password signs out all existing sessions.</p>
      <ResetPasswordForm />
    </section>
  </main>;
}
